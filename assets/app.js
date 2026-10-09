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
    const f = e.currentTarget;
    const first = f.elements.namedItem("first").value.trim(),
      last = f.elements.namedItem("last").value.trim();
    if (!first || !last) return status("Nom et prénom obligatoires.", true);
    const { error } = await db.auth.signUp({
      email: f.elements.namedItem("email").value.trim(),
      password: f.elements.namedItem("password").value,
      options: {
        data: { first_name: first, last_name: last },
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
      .select("first_name,last_name,email,phone,country,role")
      .eq("id", u.id)
      .single();
    if (pe) return status(pe.message, true);
    $("#welcome").textContent = "Bienvenue, " + (p.first_name || "client");
    $("#first").value = p.first_name;
    $("#last").value = p.last_name;
    $("#email").value = p.email;
    $("#phone").value = p.phone;
    $("#country").value = p.country;
    if (p.role === "admin") $("#adminLink").classList.remove("hidden");
    $("#profile")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      const { error } = await db
        .from("profiles")
        .update({
          first_name: f.elements.namedItem("first").value.trim(),
          last_name: f.elements.namedItem("last").value.trim(),
          phone: f.elements.namedItem("phone").value.trim(),
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
              `<option value="${safe(d.id)}">${safe(d.reference)} — ${safe(d.category)}</option>`,
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
      const { error: dbErr } = await db
        .from("documents")
        .insert({
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
    const { data: p } = await db
      .from("profiles")
      .select("role")
      .eq("id", u.id)
      .single();
    if (p?.role !== "admin") {
      location.replace("dashboard.html");
      return;
    }
    const { data: clients, error } = await db
      .from("profiles")
      .select("id,first_name,last_name,email,created_at")
      .eq("role", "client")
      .order("created_at", { ascending: false });
    if (error) return status(error.message, true);
    $("#clients").innerHTML = clients
      .map(
        (c) =>
          `<tr><td>${safe(c.first_name)} ${safe(c.last_name)}</td><td>${safe(c.email)}</td><td>${safe(new Date(c.created_at).toLocaleDateString("fr-CA"))}</td></tr>`,
      )
      .join("");
    $("#client").innerHTML = clients
      .map(
        (c) =>
          `<option value="${safe(c.id)}">${safe(c.first_name)} ${safe(c.last_name)} — ${safe(c.email)}</option>`,
      )
      .join("");
    const clientNames = new Map(
      clients.map((c) => [
        c.id,
        `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email,
      ]),
    );
    const documentPaths = new Map();
    async function loadAdminDocuments() {
      const tbody = $("#adminDocuments");
      tbody.innerHTML =
        '<tr><td colspan="6">Chargement des documents…</td></tr>';
      const { data: docs, error: docsError } = await db
        .from("documents")
        .select(
          "id,client_id,dossier_id,original_name,storage_path,status,created_at",
        )
        .order("created_at", { ascending: false });
      if (docsError) {
        tbody.innerHTML =
          '<tr><td colspan="6">Impossible de charger les documents.</td></tr>';
        return status("Documents : " + docsError.message, true);
      }
      const dossierIds = [
        ...new Set((docs || []).map((d) => d.dossier_id).filter(Boolean)),
      ];
      const references = new Map();
      if (dossierIds.length) {
        const { data: dossiers, error: dossiersError } = await db
          .from("dossiers")
          .select("id,reference")
          .in("id", dossierIds);
        if (dossiersError) {
          tbody.innerHTML =
            '<tr><td colspan="6">Impossible de charger les références des dossiers.</td></tr>';
          return status("Dossiers : " + dossiersError.message, true);
        }
        (dossiers || []).forEach((d) => references.set(d.id, d.reference));
      }
      documentPaths.clear();
      tbody.replaceChildren();
      if (!docs?.length) {
        const tr = tbody.insertRow();
        const td = tr.insertCell();
        td.colSpan = 6;
        td.textContent = "Aucun document reçu.";
        return;
      }
      docs.forEach((d) => {
        documentPaths.set(String(d.id), d.storage_path);
        const tr = tbody.insertRow();
        [
          clientNames.get(d.client_id) || "Client inconnu",
          references.get(d.dossier_id) || "Dossier inconnu",
          d.original_name,
          d.status,
          new Date(d.created_at).toLocaleString("fr-CA"),
        ].forEach((value) => {
          const td = tr.insertCell();
          td.textContent = value ?? "";
        });
        const td = tr.insertCell();
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary";
        button.textContent = "Consulter";
        button.dataset.documentId = String(d.id);
        td.append(button);
      });
    }
    $("#refreshAdminDocs")?.addEventListener("click", loadAdminDocuments);
    $("#adminDocuments")?.addEventListener("click", async (e) => {
      const button = e.target.closest("button[data-document-id]");
      if (!button) return;
      const path = documentPaths.get(button.dataset.documentId);
      if (!path) return status("Document introuvable.", true);
      button.disabled = true;
      try {
        const { data, error } = await db.storage
          .from("madic-documents")
          .createSignedUrl(path, 60);
        if (error)
          return status("Consultation impossible : " + error.message, true);
        const link = document.createElement("a");
        link.href = data.signedUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.append(link);
        link.click();
        link.remove();
      } finally {
        button.disabled = false;
      }
    });
    await loadAdminDocuments();
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
      status(
        error
          ? error.message
          : "Dossier créé. Le client peut maintenant le consulter.",
        !!error,
      );
      if (!error) f.reset();
    });
  })();
}
