/* MADIC - module de contrats. Prototype : ne constitue pas une signature electronique qualifiee. */
(() => {
  "use strict";
  const config = window.MADIC_CONFIG;
  const root = document.getElementById("madic-contracts");
  if (!root) return;
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const client = window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  const note = (s, bad = false) => {
    document.getElementById("contract-message").textContent = s;
    document.getElementById("contract-message").style.color = bad
      ? "#b42318"
      : "inherit";
  };
  const fmt = (x) => new Date(x).toLocaleString("fr-CA");
  const name = (c) =>
    [c.client_snapshot?.first_name, c.client_snapshot?.last_name]
      .filter(Boolean)
      .join(" ");
  const renderText = (c) => {
    const variables = {
      client_name: name(c),
      rate: Number(c.rate).toFixed(2),
      spouse_extra: Number(c.spouse_extra).toFixed(2),
      currency: c.currency,
      client_first_name: c.client_snapshot?.first_name || "",
      client_last_name: c.client_snapshot?.last_name || "",
      client_date_of_birth: c.client_snapshot?.date_of_birth || "",
      client_gender: c.client_snapshot?.gender || "",
      client_residential_address: c.client_snapshot?.residential_address || "",
      business_address: c.business_address,
      consultant_name: c.consultant_name,
      consultant_licence: c.consultant_licence,
    };
    return esc(c.body_snapshot)
      .replace(/\{\{([a-z_]+)\}\}/g, (_, key) => esc(variables[key] ?? ""))
      .replace(/\\n/g, "<br>")
      .replace(/\n/g, "<br>");
  };
  let contracts = [],
    dossiers = [],
    templates = [],
    profiles = [];
  const admin = root.dataset.mode === "admin";
  const button = (text, action, id) =>
    `<button type="button" class="secondary" data-action="${esc(action)}" data-id="${esc(id)}">${esc(text)}</button>`;
  async function call(fn, args) {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw error;
    return data;
  }
  async function load() {
    const {
      data: { user },
      error: authErr,
    } = await client.auth.getUser();
    if (authErr || !user) {
      location.href = "connexion.html";
      return;
    }
    if (admin) {
      const { data: p, error: pe } = await client
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (pe || p?.role !== "admin") {
        location.href = "dashboard.html";
        return;
      }
      const results = await Promise.all([
        client.from("madic_contract_templates").select("*").order("kind"),
        client
          .from("dossiers")
          .select("id,client_id,reference,status")
          .eq("status", "actif"),
        client
          .from("profiles")
          .select("id,first_name,last_name,email")
          .eq("role", "client"),
        client
          .from("madic_contracts")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      for (const r of results) if (r.error) throw r.error;
      [templates, dossiers, profiles, contracts] = results.map((r) => r.data);
      renderAdmin();
    } else {
      const { data, error } = await client
        .from("madic_contracts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      contracts = data;
      renderClient();
    }
  }
  function renderAdmin() {
    root.innerHTML = `<h2>Modèles modifiables</h2><p>Les modifications s'appliquent aux futurs contrats. Un contrat déjà créé conserve sa version.</p>
   <label>Modèle <select id="template-kind">${templates.map((t) => `<option value="${esc(t.kind)}">${esc(t.title)}</option>`).join("")}</select></label>
   <form id="template-form"><label>Titre <input name="title" required></label><label>Tarif <input name="rate" type="number" step="0.01" min="0" required></label>
   <label>Supplément conjoint <input name="spouse_extra" type="number" step="0.01" min="0" required></label>
   <label>Devise <select name="currency"><option value="USD">USD</option><option value="CAD">CAD</option></select></label>
   <label>Adresse <textarea name="address" required rows="2"></textarea></label>
   <label>Clauses du contrat <textarea name="body" rows="15" required></textarea></label>
   <p>Variables : {{client_name}}, {{client_first_name}}, {{client_last_name}}, {{client_date_of_birth}}, {{client_residential_address}}, {{rate}}, {{spouse_extra}}, {{currency}}, {{business_address}}, {{consultant_name}}, {{consultant_licence}}</p>
   <button type="submit">Enregistrer le modèle</button></form><hr>
   <h2>Préparer un contrat</h2><form id="new-contract"><label>Dossier actif <select name="dossier" required>${dossiers
     .map((d) => {
       const p = profiles.find((p) => p.id === d.client_id);
       return `<option value="${esc(d.id)}">${esc(d.reference)} - ${esc([p?.first_name, p?.last_name].filter(Boolean).join(" "))}</option>`;
     })
     .join(
       "",
     )}</select></label><label>Type <select name="kind"><option value="horaire">Horaire</option><option value="forfait">Forfaitaire</option></select></label>
   <button type="submit" ${dossiers.length ? "" : "disabled"}>Créer un brouillon</button></form><hr>
   <h2>Suivi des contrats</h2><div style="overflow-x:auto"><table><thead><tr><th>Client</th><th>Type</th><th>Statut</th><th>Date</th><th>Actions</th></tr></thead><tbody>
   ${
     contracts
       .map(
         (
           c,
         ) => `<tr><td>${esc(name(c))}</td><td>${esc(c.template_kind)}</td><td>${esc(c.status)}</td><td>${esc(fmt(c.created_at))}</td>
   <td>${button("Consulter", "view", c.id)} ${c.status === "brouillon" ? button("Modifier", "edit", c.id) + " " + button("Publier", "publish", c.id) : ""}</td></tr>`,
       )
       .join("") || '<tr><td colspan="5">Aucun contrat</td></tr>'
   }
   </tbody></table></div><div id="contract-preview"></div>`;
    const select = root.querySelector("#template-kind");
    const form = root.querySelector("#template-form");
    const fill = () => {
      const t = templates.find((x) => x.kind === select.value);
      if (!t) return;
      for (const k of ["title", "rate", "spouse_extra", "currency", "body"])
        form.elements.namedItem(k).value = t[k];
      form.elements.namedItem("address").value = t.business_address;
    };
    select.addEventListener("change", fill);
    fill();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const f = e.currentTarget;
        await call("madic_save_contract_template", {
          p_kind: select.value,
          p_title: f.elements.namedItem("title").value,
          p_body: f.elements.namedItem("body").value,
          p_rate: Number(f.elements.namedItem("rate").value),
          p_spouse_extra: Number(f.elements.namedItem("spouse_extra").value),
          p_currency: f.elements.namedItem("currency").value,
          p_address: f.elements.namedItem("address").value,
        });
        note("Modèle enregistré.");
        await load();
      } catch (err) {
        note(err.message, true);
      }
    });
    root
      .querySelector("#new-contract")
      .addEventListener("submit", async (e) => {
        e.preventDefault();
        try {
          const f = e.currentTarget;
          await call("madic_create_contract", {
            p_dossier_id: f.elements.namedItem("dossier").value,
            p_kind: f.elements.namedItem("kind").value,
          });
          note("Brouillon créé. Vérifiez son contenu avant publication.");
          await load();
        } catch (err) {
          note(err.message, true);
        }
      });
  }
  function renderClient() {
    root.innerHTML = `<h2>Mes contrats</h2><p>Consultez l'intégralité de votre contrat avant de le signer.</p>
   <table><thead><tr><th>Contrat</th><th>Statut</th><th>Action</th></tr></thead><tbody>
   ${contracts.map((c) => `<tr><td>${esc(c.title)}</td><td>${esc(c.status)}</td><td>${button("Consulter", "view", c.id)}</td></tr>`).join("") || '<tr><td colspan="3">Aucun contrat publié.</td></tr>'}
   </tbody></table><div id="contract-preview"></div>`;
  }
  function editContract(c) {
    const preview = root.querySelector("#contract-preview");
    preview.innerHTML = `<hr><h3>Modifier le brouillon - ${esc(name(c))}</h3>
   <form id="draft-edit"><label>Titre <input name="title" required></label>
   <label>Tarif <input name="rate" type="number" step="0.01" min="0" required></label>
   <label>Supplément conjoint <input name="spouse_extra" type="number" step="0.01" min="0" required></label>
   <label>Devise <select name="currency"><option>USD</option><option>CAD</option></select></label>
   <label>Adresse professionnelle <textarea name="address" rows="2" required></textarea></label>
   <label>Clauses <textarea name="body" rows="14" required></textarea></label>
   <label>Renseignements du client (JSON) <textarea name="snapshot" rows="7" required></textarea></label>
   <button type="submit">Enregistrer le brouillon</button></form>`;
    const f = preview.querySelector("#draft-edit");
    for (const [k, v] of Object.entries({
      title: c.title,
      rate: c.rate,
      spouse_extra: c.spouse_extra,
      currency: c.currency,
      body: c.body_snapshot,
      address: c.business_address,
      snapshot: JSON.stringify(c.client_snapshot, null, 2),
    }))
      f.elements.namedItem(k).value = v;
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const g = (k) => f.elements.namedItem(k).value;
        await call("madic_update_contract_draft", {
          p_contract_id: c.id,
          p_title: g("title"),
          p_body: g("body"),
          p_rate: Number(g("rate")),
          p_spouse_extra: Number(g("spouse_extra")),
          p_currency: g("currency"),
          p_address: g("address"),
          p_client_snapshot: JSON.parse(g("snapshot")),
        });
        note("Brouillon modifié.");
        await load();
      } catch (err) {
        note(err.message, true);
      }
    });
  }
  function show(c) {
    const signed = c.status === "signe";
    const preview = root.querySelector("#contract-preview");
    preview.innerHTML = `<hr><section id="contract-print"><h2>${esc(c.title)}</h2>
   <p><strong>Client :</strong> ${esc(name(c))}<br><strong>Courriel :</strong> ${esc(c.client_snapshot?.email)}<br><strong>Date de naissance :</strong> ${esc(c.client_snapshot?.date_of_birth)}<br><strong>Genre :</strong> ${esc(c.client_snapshot?.gender)}<br><strong>Adresse de résidence :</strong> ${esc(c.client_snapshot?.residential_address)}<br>
   <strong>Consultant :</strong> ${esc(c.consultant_name)} - ${esc(c.consultant_licence)}</p>
   <div style="white-space:normal;line-height:1.65">${renderText(c)}</div>
   <p><strong>Version :</strong> ${esc(c.version)} · <strong>Statut :</strong> ${esc(c.status)}</p>
   ${
     signed
       ? `<p><strong>Signé par :</strong> ${esc(c.signed_name)}<br><strong>Date (UTC) :</strong> ${esc(c.signed_at)}<br>
   <strong>Empreinte SHA-256 :</strong> <code style="overflow-wrap:anywhere">${esc(c.signed_digest)}</code></p>`
       : ""
   }</section>
   <button type="button" class="secondary" id="contract-print-button">Imprimer / enregistrer en PDF</button>
   ${
     !admin && c.status === "publie"
       ? `<form id="sign-contract"><label>Votre prénom et nom exacts
   <input name="signed_name" required autocomplete="name" placeholder="${esc(name(c))}"></label>
   <label><input type="checkbox" name="accept" required> J'ai lu l'intégralité du contrat, j'en accepte les conditions et je consens expressément à le signer électroniquement.</label>
   <button type="submit">Signer électroniquement</button></form>`
       : ""
   }`;
    preview
      .querySelector("#contract-print-button")
      .addEventListener("click", () => {
        const w = window.open("", "_blank");
        if (!w) {
          note("Autorisez les fenêtres contextuelles pour imprimer.", true);
          return;
        }
        w.opener = null;
        w.document.write(
          `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Contrat MADIC</title><body style="font:15px/1.6 Arial,sans-serif;max-width:800px;margin:30px auto">${preview.querySelector("#contract-print").innerHTML}</body></html>`,
        );
        w.document.close();
        w.focus();
        w.print();
      });
    const sign = preview.querySelector("#sign-contract");
    if (sign)
      sign.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (
          !confirm(
            "Confirmez-vous vouloir signer electroniquement ce contrat ? Cette action est definitive.",
          )
        )
          return;
        const f = e.currentTarget;
        try {
          await call("madic_sign_contract", {
            p_contract_id: c.id,
            p_full_name: f.elements.namedItem("signed_name").value,
            p_accept: f.elements.namedItem("accept").checked,
          });
          note("Contrat signé. Une trace de consentement a été enregistrée.");
          await load();
        } catch (err) {
          note(err.message, true);
        }
      });
  }
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-action]");
    if (!b) return;
    const c = contracts.find((x) => x.id === b.dataset.id);
    if (!c) return;
    if (b.dataset.action === "view") {
      show(c);
      return;
    }
    if (b.dataset.action === "edit") {
      editContract(c);
      return;
    }
    if (b.dataset.action === "publish") {
      if (
        !confirm(
          "Avez-vous vérifié toutes les clauses, les tarifs, les coordonnées et les renseignements du client ? Publier ce contrat ?",
        )
      )
        return;
      try {
        await call("madic_publish_contract", { p_contract_id: c.id });
        note("Contrat publié dans l’espace du client.");
        await load();
      } catch (err) {
        note(err.message, true);
      }
    }
  });
  load().catch((e) => note(e.message, true));
})();
