import { getStore } from "@netlify/blobs";

const store = getStore("madic-booking-slots");

/* =========================================================
   DATE MONTRÉAL
   ========================================================= */

function getMontrealDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",

    hour: "2-digit",

    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};

  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  return {
    date: `${values.year}-${values.month}-${values.day}`,

    hour: Number(values.hour),
  };
}

/* =========================================================
   AJOUTER DES JOURS
   ========================================================= */

function addDays(dateString, numberOfDays) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + numberOfDays);

  return date.toISOString().slice(0, 10);
}

/* =========================================================
   VALIDER DATE
   ========================================================= */

function validDate(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString || "")) {
    return false;
  }

  const current = getMontrealDate();

  const minDate = current.date;

  const maxDate = addDays(minDate, 14);

  return dateString >= minDate && dateString <= maxDate;
}

/* =========================================================
   VALIDER HEURE
   ========================================================= */

function validTime(time) {
  const allowed = [];

  for (let hour = 8; hour <= 23; hour++) {
    allowed.push(`${String(hour).padStart(2, "0")}:00`);
  }

  return allowed.includes(time);
}

/* =========================================================
   HANDLER NETLIFY
   ========================================================= */

export default async function handler(request) {
  /* =======================================================
     GET
     ======================================================= */

  if (request.method === "GET") {
    const url = new URL(request.url);

    const date = url.searchParams.get("date");

    if (!date || !validDate(date)) {
      return Response.json(
        {
          error: "Date invalide.",
        },
        {
          status: 400,
        },
      );
    }

    const booked = [];

    for (let hour = 8; hour <= 23; hour++) {
      const time = `${String(hour).padStart(2, "0")}:00`;

      const key = `${date}_${time.replace(":", "-")}`;

      const reservation = await store.get(key);

      if (reservation !== null) {
        booked.push(time);
      }
    }

    return Response.json({
      date,
      booked,
    });
  }

  /* =======================================================
     POST
     ======================================================= */

  if (request.method === "POST") {
    let body;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          error: "Données invalides.",
        },
        {
          status: 400,
        },
      );
    }

    const { date, time, prenom, nom, courriel } = body;

    /* =====================================================
       DATE
       ===================================================== */

    if (!validDate(date)) {
      return Response.json(
        {
          error: "La date doit être comprise dans les 14 prochains jours.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       HEURE
       ===================================================== */

    if (!validTime(time)) {
      return Response.json(
        {
          error: "Les rendez-vous sont disponibles entre 08:00 et 23:00.",
        },
        {
          status: 400,
        },
      );
    }

    /* =====================================================
       EMPÊCHER HEURE PASSÉE AUJOURD'HUI
       ===================================================== */

    const current = getMontrealDate();

    if (date === current.date) {
      const selectedHour = Number(time.substring(0, 2));

      if (selectedHour <= current.hour) {
        return Response.json(
          {
            error: "Cette heure n'est plus disponible.",
          },
          {
            status: 400,
          },
        );
      }
    }

    /* =====================================================
       CLÉ UNIQUE
       ===================================================== */

    const key = `${date}_${time.replace(":", "-")}`;

    const reservation = {
      date,
      time,
      prenom,
      nom,
      courriel,

      createdAt: new Date().toISOString(),
    };

    /* =====================================================
       RÉSERVATION ATOMIQUE
       ===================================================== */

    const { modified } = await store.setJSON(key, reservation, {
      onlyIfNew: true,
    });

    if (!modified) {
      return Response.json(
        {
          error: "Ce créneau est déjà réservé.",
        },
        {
          status: 409,
        },
      );
    }

    return Response.json(
      {
        success: true,

        date,
        time,
      },
      {
        status: 201,
      },
    );
  }

  return new Response("Method Not Allowed", {
    status: 405,
  });
}
