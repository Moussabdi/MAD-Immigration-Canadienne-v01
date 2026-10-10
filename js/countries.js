// MADIC : pays de residence, liste ISO 3166-1 en francais.
(()=>{
const countries = ["Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", "Anguilla", "Antarctique", "Antigua-et-Barbuda", "Arabie saoudite", "Argentine", "Arménie", "Aruba", "Australie", "Autriche", "Azerbaïdjan", "Bahamas", "Bahreïn", "Bangladesh", "Barbade", "Belgique", "Belize", "Bermudes", "Bhoutan", "Biélorussie", "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brunei", "Brésil", "Bulgarie", "Burkina Faso", "Burundi", "Bénin", "Cambodge", "Cameroun", "Canada", "Cap-Vert", "Chili", "Chine", "Chypre", "Colombie", "Comores", "Congo-Brazzaville", "Congo-Kinshasa", "Corée du Nord", "Corée du Sud", "Costa Rica", "Croatie", "Cuba", "Curaçao", "Côte d’Ivoire", "Danemark", "Djibouti", "Dominique", "Espagne", "Estonie", "Eswatini", "Fidji", "Finlande", "France", "Gabon", "Gambie", "Ghana", "Gibraltar", "Grenade", "Groenland", "Grèce", "Guadeloupe", "Guam", "Guatemala", "Guernesey", "Guinée", "Guinée équatoriale", "Guinée-Bissau", "Guyana", "Guyane française", "Géorgie", "Géorgie du Sud-et-les Îles Sandwich du Sud", "Haïti", "Honduras", "Hongrie", "Inde", "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Jersey", "Jordanie", "Kazakhstan", "Kenya", "Kirghizstan", "Kiribati", "Koweït", "La Réunion", "Laos", "Lesotho", "Lettonie", "Liban", "Liberia", "Libye", "Liechtenstein", "Lituanie", "Luxembourg", "Macédoine du Nord", "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Martinique", "Maurice", "Mauritanie", "Mayotte", "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie", "Montserrat", "Monténégro", "Mozambique", "Myanmar (Birmanie)", "Namibie", "Nauru", "Nicaragua", "Niger", "Nigeria", "Niue", "Norvège", "Nouvelle-Calédonie", "Nouvelle-Zélande", "Népal", "Oman", "Ouganda", "Ouzbékistan", "Pakistan", "Palaos", "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", "Pays-Bas caribéens", "Philippines", "Pologne", "Polynésie française", "Porto Rico", "Portugal", "Pérou", "Qatar", "R.A.S. chinoise de Hong Kong", "R.A.S. chinoise de Macao", "Roumanie", "Royaume-Uni", "Russie", "Rwanda", "République centrafricaine", "République dominicaine", "Sahara occidental", "Saint-Barthélemy", "Saint-Christophe-et-Niévès", "Saint-Marin", "Saint-Martin", "Saint-Martin (partie néerlandaise)", "Saint-Pierre-et-Miquelon", "Saint-Vincent-et-les Grenadines", "Sainte-Hélène", "Sainte-Lucie", "Salvador", "Samoa", "Samoa américaines", "Sao Tomé-et-Principe", "Serbie", "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie", "Soudan", "Soudan du Sud", "Sri Lanka", "Suisse", "Suriname", "Suède", "Svalbard et Jan Mayen", "Syrie", "Sénégal", "Tadjikistan", "Tanzanie", "Taïwan", "Tchad", "Tchéquie", "Terres australes françaises", "Territoire britannique de l’océan Indien", "Territoires palestiniens", "Thaïlande", "Timor oriental", "Togo", "Tokelau", "Tonga", "Trinité-et-Tobago", "Tunisie", "Turkménistan", "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu", "Venezuela", "Viêt Nam", "Wallis-et-Futuna", "Yémen", "Zambie", "Zimbabwe", "Égypte", "Émirats arabes unis", "Équateur", "Érythrée", "État de la Cité du Vatican", "États-Unis", "Éthiopie", "Île Bouvet", "Île Christmas", "Île de Man", "Île Norfolk", "Îles Caïmans", "Îles Cocos", "Îles Cook", "Îles Féroé", "Îles Heard-et-MacDonald", "Îles Malouines", "Îles Mariannes du Nord", "Îles Marshall", "Îles mineures éloignées des États-Unis", "Îles Pitcairn", "Îles Salomon", "Îles Turques-et-Caïques", "Îles Vierges britanniques", "Îles Vierges des États-Unis", "Îles Åland"];
const allowed = new Set(countries.map(x=>x.toLocaleLowerCase('fr')));
function enhance(){
 document.querySelectorAll('form#signup [name="country"], form#profile [name="country"]').forEach(el=>{
   if(el.tagName !== 'INPUT'){
     // Ne pas remplacer automatiquement un select existant et ses valeurs.
     return;
   }
   const listId='madic-country-options';
   if(!document.getElementById(listId)){
     const dl=document.createElement('datalist');dl.id=listId;
     countries.forEach(c=>{const o=document.createElement('option');o.value=c;dl.appendChild(o);});
     document.body.appendChild(dl);
   }
   el.setAttribute('list',listId);el.setAttribute('autocomplete','country-name');
   el.setAttribute('placeholder','Rechercher et selectionner un pays');
   el.setAttribute('required','');
   el.addEventListener('change',()=>{
      el.setCustomValidity(!el.value || allowed.has(el.value.trim().toLocaleLowerCase('fr'))?'':'Veuillez choisir un pays dans la liste.');
   });
   el.addEventListener('input',()=>el.setCustomValidity(''));
 });
}
window.MADIC_COUNTRIES={all:countries,isValid:(v)=>allowed.has(String(v||'').trim().toLocaleLowerCase('fr'))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
})();
