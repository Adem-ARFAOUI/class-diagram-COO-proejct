let firstSelected = null;
let relations = [];

const svg = document.querySelector("svg");
const container = document.getElementById("uml-container");

// === Création d'un marqueur pour l'héritage ===
const defs = document.querySelector("defs");
const triangle = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "marker"
);
triangle.setAttribute("id", "triangle");
triangle.setAttribute("markerWidth", "10");
triangle.setAttribute("markerHeight", "10");
triangle.setAttribute("refX", "9");
triangle.setAttribute("refY", "3");
triangle.setAttribute("orient", "auto");
triangle.setAttribute("markerUnits", "strokeWidth");
const trianglePath = document.createElementNS(
  "http://www.w3.org/2000/svg",
  "path"
);
trianglePath.setAttribute("d", "M0,0 L9,3 L0,6 Z");
trianglePath.setAttribute("fill", "white");
trianglePath.setAttribute("stroke", "black");
defs.appendChild(triangle);
triangle.appendChild(trianglePath);

function getIntersectionPoint(rect, targetX, targetY) {
  // rect : DOMRect (avec left/top/width/height) en coordonnées écran (getBoundingClientRect)
  // targetX/targetY : point vers lequel on trace (en coordonnées écran)

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = targetX - cx;
  const dy = targetY - cy;

  // Si dx,dy = 0 (même centre) : retourne un bord arbitraire (droite)
  if (dx === 0 && dy === 0) {
    return { x: cx + rect.width / 2, y: cy };
  }

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // We compare normalized distances to choose side intersection
  // On teste quel côté (horizontal ou vertical) est touché en premier
  const w = rect.width / 2;
  const h = rect.height / 2;

  // param t pour aller du centre vers l'extérieur : x = cx + t*dx, y = cy + t*dy
  // On cherche t où x atteint cx ± w ou y atteint cy ± h (le premier positif)
  let tX = Infinity;
  let tY = Infinity;

  if (absDx > 1e-6) {
    tX = w / absDx;
  }
  if (absDy > 1e-6) {
    tY = h / absDy;
  }

  // On prend le plus petit t positif (première face atteinte)
  const t = Math.min(tX, tY);

  const ix = cx + dx * t;
  const iy = cy + dy * t;

  return { x: ix, y: iy };
}

// === Fonction pour dessiner une relation ===
function drawLine(id1, id2, type, name) {
  const box1 = document.getElementById(id1).getBoundingClientRect();
  const box2 = document.getElementById(id2).getBoundingClientRect();
  const c = container.getBoundingClientRect(); // container en coords écran

  // Centres en coords écran
  const cx1 = box1.left + box1.width / 2;
  const cy1 = box1.top + box1.height / 2;
  const cx2 = box2.left + box2.width / 2;
  const cy2 = box2.top + box2.height / 2;

  // Points d'intersection exacts (coords écran)
  const p1 = getIntersectionPoint(box1, cx2, cy2); // point de sortie du premier rectangle
  const p2 = getIntersectionPoint(box2, cx1, cy1); // point d'entrée du deuxième rectangle

  // Convertir en coords relatives au SVG (container)
  const x1 = p1.x - c.left;
  const y1 = p1.y - c.top;
  const x2 = p2.x - c.left;
  const y2 = p2.y - c.top;

  // vecteur normalisé de la ligne (en coordonnées SVG)
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  // Ligne SVG
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.classList.add("relation");
  line.style.stroke = "#a36f16ff";
  line.style.strokeWidth = 2;

  // marker (héritage ou flèche) - suppose que #triangle et #arrow existent
  if (type === "heritage") {
    line.setAttribute("marker-end", "url(#triangle)");
  } else {
    line.removeAttribute("marker-end", "url(#rectangle)"); // s'assure qu'il n'y a pas de flèche
  }

  // Multiplicités : placer près du bord
  const multi = document.getElementById("relationType").value || "";
  const [multiFrom, multiTo] = multi
    .split("to")
    .map((s) => (s ? s.trim() : ""));

  const distanceFromBox = 20; // distance le long de la ligne depuis le bord
  const perpOffset = 8; // décalage perpendiculaire pour lisibilité (±)
  // vecteur perpendiculaire unitaire (pour décaler légèrement)
  const px = -uy;
  const py = ux;

  // text FROM (près de p1, légèrement vers l'extérieur/centre selon ux)
  if (multiFrom) {
    const textFrom = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    textFrom.textContent = multiFrom;
    // x,y calculés à partir du point d'intersection plus déplacement le long de la ligne
    const tx = x1 + ux * distanceFromBox + px * perpOffset;
    const ty = y1 + uy * distanceFromBox + py * perpOffset;
    textFrom.setAttribute("x", tx);
    textFrom.setAttribute("y", ty);
    textFrom.setAttribute("font-size", "13");
    textFrom.setAttribute("fill", "black");
    textFrom.setAttribute("text-anchor", "middle");
    svg.appendChild(textFrom);
  }

  // text TO (près de p2)
  if (multiTo) {
    const textTo = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    textTo.textContent = multiTo;
    const tx2 = x2 - ux * distanceFromBox + px * perpOffset;
    const ty2 = y2 - uy * distanceFromBox + py * perpOffset;
    textTo.setAttribute("x", tx2);
    textTo.setAttribute("y", ty2);
    textTo.setAttribute("font-size", "13");
    textTo.setAttribute("fill", "black");
    textTo.setAttribute("text-anchor", "middle");
    svg.appendChild(textTo);
  }

  // Nom de l'association (au-dessus du milieu de la ligne)
  if (type !== "heritage" && name) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const textName = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text"
    );
    textName.setAttribute("x", midX);
    textName.setAttribute("y", midY - 10); // au-dessus de la ligne
    textName.setAttribute("text-anchor", "middle");
    textName.setAttribute("font-size", "12");
    textName.setAttribute("fill", "#060606");
    textName.textContent = name;
    svg.appendChild(textName);
  }

  svg.appendChild(line);

  relations.push({
    from: id1,
    to: id2,
    type,
    multiFrom,
    multiTo,
    element: line,
  });
}

// === Sélection des classes ===
document.querySelectorAll(".class-box").forEach((box) => {
  box.addEventListener("click", () => {
    if (!firstSelected) {
      firstSelected = box;
      box.classList.add("selected");
    } else if (firstSelected === box) {
      firstSelected.classList.remove("selected");
      firstSelected = null;
    } else {
      const type = document.getElementById("relationType").value;
      let name = "";
      if (type !== "heritage") {
        name = prompt("Entrez le nom de l'association :");
        if (!name) return;
      }
      drawLine(firstSelected.id, box.id, type, name);
      firstSelected.classList.remove("selected");
      firstSelected = null;
    }
  });
});

const validateBtn = document.getElementById("validateRelations");

// Vérifie si l'utilisateur a déjà validé
if (localStorage.getItem("validated") === "true") {
  validateBtn.disabled = true;
  validateBtn.textContent = "Déjà validé ✅";
}
// === Validation ===
validateBtn.addEventListener("click", () => {
  const correct = [
    { from: "Assurance", to: "Reparation", type: ["0..* to 0..*"] },
    { from: "Assurance", to: "Vehicule", type: ["1..* to 1..*"] },
    { from: "Reparation", to: "Vehicule", type: ["0..* to 1"] },
    { from: "Garentie", to: "Vehicule", type: ["0..* to 1"] },
    { from: "Vehicule", to: "Vante", type: ["1 to *"] },
    { from: "Vante", to: "Client", type: ["1..* to 1"] },
    { from: "Reparation", to: "Facture", type: ["1..* to 0..*"] },
    { from: "Reparation", to: "ChefAtelier", type: ["1..* to 1"] },
    { from: "Garentie", to: "Reparation", type: ["0..* to 0..*"] },
    { from: "Client", to: "PersPhysique", type: ["heritage"] },
    { from: "Client", to: "persMorale", type: ["heritage"] },
  ];

  let score = 0;
  const counted = new Set();

  function normalizeType(str) {
    return str.replace(/\.\./g, "").replace(/\s+/g, "").toLowerCase(); // 0..* → 0* et supprime espaces
  }

  relations.forEach((rel) => {
    const relFrom = rel.from;
    const relTo = rel.to;
    const relType = normalizeType(rel.type);

    // Clé unique pour éviter double comptage
    const key = [relFrom, relTo, relType].sort().join("-");
    if (counted.has(key)) return;

    // Chercher correspondance
    const match = correct.find((c) => {
      return c.type.some((t) => {
        const tNorm = normalizeType(t);
        // Gestion des types directionnels comme "1 to *"
        if (t.includes("to") && t.includes("*") && t.includes("1")) {
          // Comparer dans le bon sens
          return c.from === relFrom && c.to === relTo && tNorm === relType;
        } else {
          // ordre indifférent
          const pair1 = c.from + "-" + c.to;
          const pair2 = c.to + "-" + c.from;
          const relPair = relFrom + "-" + relTo;
          return tNorm === relType && (pair1 === relPair || pair2 === relPair);
        }
      });
    });

    if (match) {
      rel.element.style.stroke = "green";
      score++;
    } else {
      rel.element.style.stroke = "red";
    }
    counted.add(key);
  });
  const studentName = document.getElementById("studentId").value.trim();
  if (!studentName) {
    alert("Veuillez entrer votre nom !");
  } else {
    fetch("http://localhost:3000/submit-score", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: studentName,
        score: score,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        alert("Score enregistré sur la base de données !");
      })
      .catch((err) => {
        console.error(err);
        alert("Erreur lors de l'enregistrement du score !");
      });
  }

  const result = document.getElementById("result");
  if (score === correct.length) {
    result.innerHTML = `<span class="correct">Toutes les relations sont correctes (${score}/${correct.length}) ✅</span>`;
  } else {
    result.innerHTML = `<span class="wrong">${score}/${correct.length} relations correctes.</span>`;
  }
  // Désactiver le boutton ya adoum ya behi
  validateBtn.disabled = true;
  validateBtn.textContent = "Déjà validé ✅";

  // Sauvegarder l'état dans le localStorage
  localStorage.setItem("validated", "true");
});
function reset() {
  localStorage.removeItem("validated");
  location.reload();
}
