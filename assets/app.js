const conf = window.MADIC_CONFIG;
const $ = (s) => document.querySelector(s);
const status = (text, error = false) => {
  const e = $("#message");
  if (e) {
    e.textContent = text;
    e.className = error ? "notice danger" : "notice ok";
  }
};
const safe = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const ready =
  conf &&
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(conf.url) &&
  !conf.anonKey.includes("YOUR_") &&
  window.supabase;
if (!ready)
  status(
    "Configuration Supabase manquante. Consultez le fichier README.md.",
    true,
  );
const db = ready
  ? window.supabase.createClient(conf.url, conf.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
async function user() {
  if (!db) return null;
  const { data, error } = await db.auth.getUser();
  if (error) return null;
  return data.user;
}
async function protect() {
  const u = await user();
  if (!u) {
    location.replace("connexion.html");
    return null;
  }
  return u;
}
async function signOut() {
  if (db) await db.auth.signOut();
  location.href = "connexion.html";
}
$("#logout")?.addEventListener("click", signOut);
const page = document.body.dataset.page;
if (page === "signup") {
  $("#signup")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!db) return;
    const f = e.currentTarget,
      get = (n) => f.elements.namedItem(n)?.value?.trim() || "";
    const first = get("first"),
      last = get("last"),
      dob = get("date_of_birth"),
      gender = get("gender"),
      phone = get("phone");
    const address = {
      address_number: get("address_number"),
      address_street: get("address_street"),
      address_apartment: get("address_apartment"),
      address_city: get("address_city"),
      address_region: get("address_region"),
      address_postal_code: get("address_postal_code"),
      country: get("country"),
    };
    if (
      !first ||
      !last ||
      !phone ||
      !dob ||
      !["Homme", "Femme"].includes(gender) ||
      !address.address_number ||
      !address.address_street ||
      !address.address_city ||
      !address.address_region ||
      !address.country
    )
      return status(
        "Veuillez compléter les renseignements obligatoires.",
        true,
      );
    if (
      window.MADIC_COUNTRIES &&
      !window.MADIC_COUNTRIES.isValid(address.country)
    )
      return status("Veuillez sélectionner un pays dans la liste.", true);
    if (!window.MADIC_COUNTRIES)
      return status(
        "La liste des pays n’est pas chargée. Actualisez la page.",
        true,
      );
    if (dob > new Date().toISOString().slice(0, 10))
      return status("La date de naissance ne peut pas être future.", true);
    const { error } = await db.auth.signUp({
      email: get("email"),
      password: f.elements.namedItem("password").value,
      options: {
        data: {
          first_name: first,
          last_name: last,
          phone,
          date_of_birth: dob,
          gender,
          ...address,
        },
        emailRedirectTo: new URL("connexion.html", location.href).href,
      },
    });
    status(
      error
        ? error.message
        : "Compte créé. Vérifiez votre courriel avant de vous connecter.",
      !!error,
    );
    if (!error) f.reset();
  });
}
if (page === "login") {
  $("#login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!db) return;
    const f = e.currentTarget;
    const { error } = await db.auth.signInWithPassword({
      email: f.elements.namedItem("email").value.trim(),
      password: f.elements.namedItem("password").value,
    });
    if (error) return status(error.message, true);
    location.href = "dashboard.html";
  });
  $("#forgot")?.addEventListener("click", async () => {
    if (!db) return;
    const email = $("#email").value.trim();
    if (!email) return status("Saisissez votre courriel.", true);
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("reset.html", location.href).href,
    });
    status(
      error
        ? error.message
        : "Si le compte existe, un courriel de réinitialisation sera envoyé.",
      !!error,
    );
  });
}
if (page === "reset") {
  $("#reset")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!db) return;
    const { error } = await db.auth.updateUser({
      password: e.currentTarget.password.value,
    });
    status(
      error
        ? error.message
        : "Mot de passe mis à jour. Vous pouvez vous connecter.",
      !!error,
    );
  });
}
if (page === "dashboard") {
  (async () => {
    const u = await protect();
    if (!u) return;
    const { data: p, error: pe } = await db
      .from("profiles")
      .select(
        "first_name,last_name,email,phone,country,date_of_birth,residential_address,gender,address_number,address_street,address_apartment,address_city,address_region,address_postal_code,role",
      )
      .eq("id", u.id)
      .single();
    if (pe) return status(pe.message, true);
    $("#welcome").textContent = "Bienvenue, " + (p.first_name || "client");
    $("#first").value = p.first_name;
    $("#last").value = p.last_name;
    $("#email").value = p.email;
    $("#phone").value = p.phone;
    $("#country").value = p.country;
    if ($("#date_of_birth")) $("#date_of_birth").value = p.date_of_birth || "";
    for (const k of [
      "gender",
      "address_number",
      "address_street",
      "address_apartment",
      "address_city",
      "address_region",
      "address_postal_code",
    ]) {
      const el = document.getElementById(k);
      if (el) el.value = p[k] || "";
    }
    if ($("#residential_address"))
      $("#residential_address").value = p.residential_address || "";
    if (p.role === "admin") $("#adminLink").classList.remove("hidden");
    $("#profile")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      if (
        window.MADIC_COUNTRIES &&
        !window.MADIC_COUNTRIES.isValid(f.elements.namedItem("country").value)
      )
        return status("Veuillez sélectionner un pays dans la liste.", true);
      const { error } = await db
        .from("profiles")
        .update({
          first_name: f.elements.namedItem("first").value.trim(),
          last_name: f.elements.namedItem("last").value.trim(),
          phone: f.elements.namedItem("phone").value.trim(),
          country: f.elements.namedItem("country").value.trim(),
          date_of_birth: f.elements.namedItem("date_of_birth").value || null,
          gender: f.elements.namedItem("gender").value,
          address_number: f.elements.namedItem("address_number").value.trim(),
          address_street: f.elements.namedItem("address_street").value.trim(),
          address_apartment: f.elements
            .namedItem("address_apartment")
            .value.trim(),
          address_city: f.elements.namedItem("address_city").value.trim(),
          address_region: f.elements.namedItem("address_region").value.trim(),
          address_postal_code: f.elements
            .namedItem("address_postal_code")
            .value.trim(),
          country: f.elements.namedItem("country").value.trim(),
        })
        .eq("id", u.id);
      status(error ? error.message : "Profil enregistré.", !!error);
    });
    const { data: dossiers, error: de } = await db
      .from("dossiers")
      .select("id,reference,category,status,created_at")
      .eq("client_id", u.id)
      .order("created_at", { ascending: false });
    if (de) return status(de.message, true);
    $("#dossiers").innerHTML = dossiers.length
      ? dossiers
          .map(
            (d) =>
              `<tr><td>${safe(d.reference)}</td><td>${safe(d.category)}</td><td>${safe(d.status)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="3">Aucun dossier attribué. MADIC doit d’abord valider votre inscription.</td></tr>';
    const active = dossiers.filter((d) => d.status === "actif");
    $("#dossier").innerHTML = active.length
      ? active
          .map(
            (d) =>
              `<option value="${safe(d.id)}">${safe(d.reference)} - ${safe(d.category)}</option>`,
          )
          .join("")
      : '<option value="">Aucun dossier actif</option>';
    $("#uploadButton").disabled = !active.length;
    await loadDocs();
    async function loadDocs() {
      const { data: docs, error } = await db
        .from("documents")
        .select("id,original_name,status,created_at,storage_path")
        .eq("client_id", u.id)
        .order("created_at", { ascending: false });
      if (error) return status(error.message, true);
      $("#documents").innerHTML = docs.length
        ? docs
            .map(
              (d) =>
                `<tr><td>${safe(d.original_name)}</td><td>${safe(d.status)}</td><td><button class="secondary" type="button" data-path="${safe(d.storage_path)}">Télécharger</button></td></tr>`,
            )
            .join("")
        : '<tr><td colspan="3">Aucun document transmis.</td></tr>';
    }
    $("#documents").addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-path]");
      if (!b) return;
      const { data, error } = await db.storage
        .from("madic-documents")
        .createSignedUrl(b.dataset.path, 60);
      if (error) return status(error.message, true);
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    });
    $("#upload")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!active.length) return;
      const f = e.currentTarget,
        file = f.elements.namedItem("file").files[0],
        dossierId = f.elements.namedItem("dossier").value;
      if (!file) return status("Sélectionnez un fichier.", true);
      if (
        !["application/pdf", "image/jpeg", "image/png"].includes(file.type) ||
        file.size > 10 * 1024 * 1024 ||
        file.size === 0
      )
        return status("PDF, JPG ou PNG uniquement, 10 Mo maximum.", true);
      if (!active.some((d) => d.id === dossierId))
        return status("Dossier invalide.", true);
      const path = `${u.id}/${dossierId}/${crypto.randomUUID()}`;
      $("#uploadButton").disabled = true;
      const { error: upErr } = await db.storage
        .from("madic-documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        $("#uploadButton").disabled = false;
        return status(upErr.message, true);
      }
      const { error: dbErr } = await db.from("documents").insert({
        dossier_id: dossierId,
        client_id: u.id,
        original_name: file.name.slice(0, 240),
        storage_path: path,
        mime_type: file.type,
        size_bytes: file.size,
      });
      $("#uploadButton").disabled = false;
      if (dbErr)
        return status(
          "Fichier transféré, mais enregistrement incomplet. Contactez MADIC. Référence: " +
            path,
          true,
        );
      f.reset();
      status("Document transmis.");
      await loadDocs();
    });
  })();
}
if (page === "admin") {
  (async () => {
    const u = await protect();
    if (!u) return;
    const { data: p, error: pe } = await db
      .from("profiles")
      .select("role")
      .eq("id", u.id)
      .single();
    if (pe || p?.role !== "admin") {
      location.replace("dashboard.html");
      return;
    }
    let clients = [];
    const names = new Map();
    const loadClients = async () => {
      const { data, error } = await db
        .from("profiles")
        .select("id,first_name,last_name,email,created_at")
        .eq("role", "client")
        .order("created_at", { ascending: false });
      if (error) return status(error.message, true);
      clients = data || [];
      names.clear();
      clients.forEach((c) =>
        names.set(
          c.id,
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
            c.email ||
            "Client",
        ),
      );
      $("#clients").innerHTML =
        clients
          .map(
            (c) =>
              `<tr><td>${safe(names.get(c.id))}</td><td>${safe(c.email)}</td><td>${safe(c.created_at ? new Date(c.created_at).toLocaleDateString("fr-CA") : "")}</td></tr>`,
          )
          .join("") || '<tr><td colspan="3">Aucun client inscrit</td></tr>';
      $("#client").innerHTML = clients
        .map(
          (c) =>
            `<option value="${safe(c.id)}">${safe(names.get(c.id))} - ${safe(c.email)}</option>`,
        )
        .join("");
      if ($("#adminClientCount"))
        $("#adminClientCount").textContent = String(clients.length);
    };
    const loadDossiers = async () => {
      const body = $("#adminDossiers");
      if (!body) return;
      const { data, error } = await db
        .from("dossiers")
        .select("id,client_id,reference,category,status,created_at")
        .order("created_at", { ascending: false });
      if (error) {
        body.innerHTML = '<tr><td colspan="5">Erreur de chargement</td></tr>';
        return status(error.message, true);
      }
      const labels = {
        en_attente: "En attente",
        actif: "Actif",
        ferme: "Fermé",
      };
      body.innerHTML =
        (data || [])
          .map(
            (d) =>
              `<tr><td>${safe(d.reference)}</td><td>${safe(names.get(d.client_id) || "Client non répertorié")}</td><td>${safe(d.category)}</td><td><select aria-label="Statut ${safe(d.reference)}" data-id="${safe(d.id)}" data-original="${safe(d.status)}">${Object.entries(
                labels,
              )
                .map(
                  ([v, l]) =>
                    `<option value="${v}" ${v === d.status ? "selected" : ""}>${l}</option>`,
                )
                .join(
                  "",
                )}</select></td><td><button type="button" class="secondary" data-save="${safe(d.id)}">Enregistrer</button></td></tr>`,
          )
          .join("") || '<tr><td colspan="5">Aucun dossier créé</td></tr>';
    };
    await loadClients();
    await loadDossiers();
    $("#refreshDossiers")?.addEventListener("click", loadDossiers);
    $("#adminDossiers")?.addEventListener("click", async (e) => {
      const b = e.target.closest("button[data-save]");
      if (!b) return;
      const s = b.closest("tr").querySelector("select[data-id]");
      if (s.value === s.dataset.original) return status("Statut inchangé.");
      b.disabled = true;
      const { data, error } = await db
        .from("dossiers")
        .update({ status: s.value })
        .eq("id", b.dataset.save)
        .select("id,status");
      b.disabled = false;
      if (error || !data?.length)
        return status(
          error?.message || "Mise à jour non autorisée par Supabase.",
          true,
        );
      status("Statut enregistré.");
      await loadDossiers();
    });
    $("#createDossier")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const { error } = await db
        .from("dossiers")
        .insert({
          client_id: f.elements.namedItem("client").value,
          reference: f.elements.namedItem("reference").value.trim(),
          category: f.elements.namedItem("category").value.trim(),
          status: f.elements.namedItem("status").value,
        });
      if (error) return status(error.message, true);
      f.reset();
      status("Dossier créé.");
      await loadDossiers();
    });
  })();
}
