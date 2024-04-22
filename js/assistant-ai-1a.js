// S'exécute une fois que le contenu de la page est complètement chargé
document.addEventListener("DOMContentLoaded", function () {
  // Sélectionne tous les boutons et éléments spécifiques du DOM par leur ID
  var allButtons = document.querySelectorAll("button");
  var microButton = document.getElementById("assistant1a-record");
  var stopButton = document.getElementById("assistant1a-stop");
  var submitButton = document.getElementById("assistant1a-submit");
  var fileSubmitButton = document.getElementById("assistant1a-file-submit");
  var fileInput = document.getElementById("assistant1a-file");
  var questionInput = document.getElementById("assistant1a-question");
  var resetButton = document.getElementById("assistant1a-reset");
  var indicator = document.getElementById("assistant1a-file-upload-status");
  var selectedVoice; // Variable globale pour stocker la voix sélectionnée
  var responseContainer = document.getElementById("assistant1a-response");
  var historyContainer = document.getElementById("assistant1a-history");
  var costEstimate = document.getElementById("cost-estimate-fieldset");
  var actionsContainer = document.getElementById("response-actions");
  let globalIsVoice = false;
  var interactionStarted = false;
  // var questionText = document
  //   .getElementById("assistant1a-question")
  //   .value.trim();

  const instructionDiv = document.getElementById("instructionText");

  const consignes = {
    salarie: "Copiez et collez l'entretien ou importez un fichier (DOC, DOCX).",
    direction:
      "Copiez et collez l'entretien ou importez un fichier (DOC, DOCX).",
    document: "Importez le fichier (PDF) à analyser pour cette session.",
    mp3: "Utilisez l'importation de fichier pour partager l'enregistrement MP3 à transcrire.",
    discussion:
      "Utilisez cet espace pour discuter de la rédaction et de la structuration de votre rapport.",
  };

  // Initialisation des variables d'état
  var isRequestPending = false;
  //var lastAction = null; // Initialisation de lastAction pour une utilisation dans le code

  // Gestion de la synthèse vocale et de la reconnaissance vocale
  var synth = window.speechSynthesis;
  var recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.lang = "fr-FR"; // Définit le français comme langue de reconnaissance
  recognition.continuous = false; // Ne continue pas à écouter après que l'utilisateur a cessé de parler

  // Gestion des boutons pour copier et sauvegarder l'historique du chat
  var copyButton = document.getElementById("copyButton");
  var saveButton = document.getElementById("saveButton");

  // ! FONCTION COPY et SAVE ----------------------
  function adjustStyleForPDF(element) {
    const originalStyle = element.getAttribute("style");
    element.style.color = "black"; // Couleur de base pour tout le texte
    element.style.backgroundColor = "white"; // Supprime le fond sombre

    // Modification spécifique pour les titres ou autres éléments
    const titles = element.querySelectorAll("h1, h2, h3, h4, h5, h6"); // Sélection de tous les titres
    titles.forEach((title) => {
      title.style.color = "black"; // Modifie la couleur des titres en noir
    });

    // Sauvegarder et retourner les styles originaux si nécessaire
    return {
      elementStyle: originalStyle,
      titleStyles: Array.from(titles).map((title) => title.style.color),
    };
  }

  function setInteractionStarted(started) {
    interactionStarted = started;
    setButtonStates(); // Mise à jour de l'état des boutons chaque fois que l'état d'interaction change
  }

  function restoreOriginalStyle(element, styles) {
    element.setAttribute("style", styles.elementStyle);
    const titles = element.querySelectorAll("h1, h2, h3, h4, h5, h6");
    titles.forEach((title, index) => {
      title.style.color = styles.titleStyles[index]; // Restaure les couleurs originales des titres
    });
  }

  // Fonction pour copier l'historique du chat dans le presse-papiers
  function copyChatHistory(event) {
    event.preventDefault(); // Empêche l'action par défaut du navigateur
    const responseElement = document.getElementById("assistant1a-response");

    // Utilisation de innerHTML pour obtenir le contenu HTML
    const responseHtml = responseElement.innerHTML;

    // Copier le contenu formaté dans le presse-papiers
    navigator.clipboard
      .write([
        new ClipboardItem({
          "text/html": new Blob([responseHtml], { type: "text/html" }),
          "text/plain": new Blob([responseElement.innerText], {
            type: "text/plain",
          }),
        }),
      ])
      .then(() => {
        alert(
          "L'échange a été copié dans le presse-papiers avec le formatage."
        );
      })
      .catch((err) => {
        console.error("Erreur lors de la copie:", err);
      });
  }

  // Fonction pour sauvegarder l'historique du chat sur le disque local
  function saveChatHistory(event) {
    event.preventDefault();

    const element = document.getElementById("assistant1a-response");
    if (!element) {
      console.error("Élément non trouvé");
      return;
    }

    // Ajustement du style pour le PDF
    const originalStyles = adjustStyleForPDF(element);

    html2canvas(element, {
      backgroundColor: null, // Assure que le fond est transparent
      logging: true,
      scale: 2, // Améliore la qualité de l'image capturée
    })
      .then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const jsPDF = window.jspdf.jsPDF;
        const doc = new jsPDF();
        const imgWidth = 210; // Largeur d'une page A4 en mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        doc.save("chat-history.pdf");

        // Restauration du style original après la capture
        restoreOriginalStyle(element, originalStyles);
      })
      .catch((err) => {
        console.error(
          "Erreur lors de la capture ou de la sauvegarde du PDF:",
          err
        );
        // Restauration du style en cas d'erreur également
        restoreOriginalStyle(element, originalStyles);
      });
  }

  // ! FIN FONCTION COPY et SAVE ------------------

  // Crée un bouton pour annuler le choix du fichier
  var cancelButton = document.createElement("button");
  cancelButton.textContent = "Annuler le choix du fichier";
  cancelButton.id = "assistant1a-cancel-file";
  cancelButton.className = "custom-button";
  cancelButton.style.display = "none";
  cancelButton.classList.add("assistant1a-cancel-file");
  document.getElementById("assistant1a-file-section").appendChild(cancelButton);

  // Gestion de l'annulation de la sélection d'un fichier
  cancelButton.addEventListener("click", function () {
    fileInput.value = ""; // Réinitialise le choix du fichier
    this.style.display = "none"; // Cache le bouton d'annulation
    costEstimate.style.display = "none";
    setButtonStates(); // Met à jour l'état des boutons
  });

  // Gestion de la sélection de fichier
  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      cancelButton.style.display = "block";
      costEstimate.style.display = "block";
      lastAction = "file";
      setButtonStates(); // Met à jour l'état des boutons
    } else {
      costEstimate.style.display = "none"; // Cache le `fieldset` si aucun fichier n'est sélectionné
    }
  });

  // Ajout d'une nouvelle fonction pour effacer l'historique
  function clearHistory() {
    // var historyContainer = document.getElementById("assistant1a-history");
    historyContainer.innerHTML = ""; // Efface le contenu de l'historique
    historyContainer.style.display = "none";
  }

  function formatLists(text) {
    if (typeof text !== "string") {
      // Si ce n'est pas une chaîne, convertissez-le en chaîne ou gérez l'erreur
      console.error("formatLists expects a string but got:", typeof text);
      return ""; // Retourner une chaîne vide ou gérer autrement
    }
    return text.replace(/^-\s(.*)/gm, "<ul><li>$1</li></ul>");
  }

  // Gestion de la checkbox pour afficher l'historique
  // var historyContainer = document.getElementById("assistant1a-history");
  // var isFirstExchange = true;
  var toggleHistoryCheckbox = document.getElementById("toggleHistoryCheckbox");

  // Initialise l'affichage de l'historique en fonction de l'état initial de la case à cocher
  historyContainer.style.display = toggleHistoryCheckbox.checked
    ? "block"
    : "none";

  // Gestionnaire pour la case à cocher
  toggleHistoryCheckbox.addEventListener("change", function () {
    historyContainer.style.display = this.checked ? "block" : "none";
  });

  function updateResponseContainer(data, isVoice) {
    // Vérifie si les données reçues sont vides ou non valides
    if (
      !data ||
      data === "" ||
      typeof data !== "object" ||
      Object.keys(data).length === 0
    ) {
      console.log("No valid data provided to updateResponseContainer.");
      responseContainer.innerHTML = "Aucune donnée valide reçue du serveur.";
      return; // Stoppe l'exécution si les données ne sont pas valides
    }

    console.log("Received data:", JSON.stringify(data, null, 2)); // Log des données reçues pour le débogage

    let content = "";

    // Gère les différents statuts de réponse pour les tâches asynchrones et les réponses directes
    if (data.status === "finished" && data.response !== undefined) {
      setLoadingState(false); // Arrête l'indication de chargement
      content = removeJsonArtifacts(data.response); // Nettoie les artefacts JSON de la réponse
    } else if (data.status === "failed") {
      console.error("Job failed:", data.error, data.details);
      content = "Erreur de traitement : " + data.error; // Prépare le message d'erreur
    } else if (data.status === "processing") {
      console.log("Job is still processing.");
      content = "Traitement en cours..."; // Informe l'utilisateur que la tâche est en cours
    } else if (data.response) {
      // Pour les réponses directes sans statut de tâche
      content = removeJsonArtifacts(data.response);
    } else {
      console.error("Unexpected data structure:", data);
      content = "Réponse inattendue du serveur."; // Message pour une structure de données inattendue
    }

    var formattedContent = formatLists(content); // Applique un formatage aux listes si nécessaire

    // Met à jour le contenu du conteneur de réponse avec la réponse formatée
    if (formattedContent.trim() !== "") {
      responseContainer.innerHTML = formattedContent;
      responseContainer.style.display = "block";
      actionsContainer.style.display = "block";
      addHistoryEntry("", formattedContent, "response");
      setButtonStates();
    } else {
      responseContainer.style.display = "none";
      actionsContainer.style.display = "none";
    }

    // Utilise la synthèse vocale si nécessaire
    if (formattedContent.trim() !== "" && isVoice) {
      speak(formattedContent);
    }
  }

  function removeJsonArtifacts(text) {
    if (!text || typeof text !== "string") {
      return ""; // Retourner une chaîne vide si l'entrée n'est pas valide
    }

    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && parsed.response) {
        return parsed.response; // Supposer que 'parsed' est un objet avec une propriété 'response'
      }
      return text; // Retourner le texte original si ce n'est pas un objet ou manque 'response'
    } catch (e) {
      return text; // Le texte n'est pas du JSON, retourner tel quel
    }
  }

  // Fonction pour ajouter des entrées à l'historique avec classe pour style
  function addHistoryEntry(questionText, responseText, type) {
    var entry = document.createElement("p");
    entry.className = type; // Classe pour appliquer un style conditionnel

    // Créer un élément span pour le préfixe en gras
    var prefix = document.createElement("span");
    prefix.className = "prefix";
    prefix.innerHTML = type === "question" ? "VOUS" : "ASSISTANT";

    // Créer un élément span pour le texte, non gras
    var message = document.createElement("span");
    message.className = "message";
    // Assurez-vous que le texte est transmis sans le préfixe
    message.innerHTML = type === "question" ? questionText : responseText;

    // Ajouter les éléments span à l'entrée, avec le message sur une nouvelle ligne
    entry.appendChild(prefix);
    // entry.appendChild(document.createElement("br")); // Saut de ligne après le préfixe
    entry.appendChild(message);

    // var historyContainer = document.getElementById("assistant1a-history");
    historyContainer.appendChild(entry);
    historyContainer.scrollTop = historyContainer.scrollHeight; // Assure le défilement vers le bas
  }

  // Met à jour les états des boutons en fonction des conditions spécifiques
  function setButtonStates() {
    // Vérifie la présence de fichiers, de texte et si la synthèse vocale est active
    let hasFile = fileInput.files.length > 0;
    let hasText = questionInput.value.trim().length > 0;
    let isSpeaking = synth.speaking;

    console.log(
      `hasFile: ${hasFile}, hasText: ${hasText}, isSpeaking: ${isSpeaking}, isRequestPending: ${isRequestPending}`
    );

    // Désactive tous les boutons par défaut
    allButtons.forEach((btn) => (btn.disabled = true));

    // Active ou désactive les boutons selon les conditions spécifiques
    if (!isRequestPending) {
      microButton.disabled = hasFile || isSpeaking;
      submitButton.disabled = hasFile || !hasText || isSpeaking;
      fileSubmitButton.disabled = !hasFile || isSpeaking;
      cancelButton.style.display = hasFile ? "block" : "none";
    }
    stopButton.disabled = !isSpeaking;
    // resetButton.disabled = lastAction === null && !isSpeaking;
    resetButton.disabled =
      !interactionStarted || isSpeaking || isRequestPending;

    // Active les boutons de copie et de sauvegarde si du texte est présent dans la réponse
    var responseText = document.getElementById(
      "assistant1a-response"
    ).innerText;
    if (responseText.trim().length > 0) {
      copyButton.disabled = false;
      saveButton.disabled = false;
    }
  }

  // Ajoute un écouteur d'événements pour les entrées de texte
  questionInput.addEventListener("input", () => {
    lastAction = "text";
    setButtonStates();
  });

  // Ajoute un écouteur d'événements pour le bouton de réinitialisation
  resetButton.addEventListener("click", resetUI);

  // Configure l'état de chargement lors des requêtes
  function setLoadingState(isLoading, message = "") {
    isRequestPending = isLoading;
    indicator.style.display = isLoading ? "block" : "none";
    var loadingMessageElement = document.getElementById("loadingMessage");
    var staticMessageElement = document.getElementById("staticMessage"); // Element pour le message statique

    if (isLoading && message) {
      loadingMessageElement.textContent = message;
      loadingMessageElement.style.display = "block";
      staticMessageElement.style.display = "block"; // Affiche le message statique quand le loader est actif
    } else {
      loadingMessageElement.style.display = "none";
      staticMessageElement.style.display = "none"; // Cache le message statique quand le loader n'est pas actif
    }
    setButtonStates();
  }

  // ! DEBUT ASYNCHRONE

  // Fonction pour vérifier l'état d'une tâche en arrière-plan
  function checkTaskStatus(jobId) {
    fetch(`https://kokua060424-caea7e92447d.herokuapp.com/results/${jobId}`)
      .then((response) => response.json())
      .then((data) => {
        console.log("Task Status:", data);
        if (data.status === "processing") {
          setLoadingState(true, "- TRAITEMENT EN COURS -");
        } else if (data.status === "finished") {
          setLoadingState(false);
          updateResponseContainer(data, globalIsVoice);

          clearInterval(checkInterval); // Arrête l'intervalle lorsque le travail est terminé
        } else if (data.status === "failed") {
          setLoadingState(
            false,
            "Le traitement a échoué. Veuillez réessayer ou contacter le support."
          );
          clearInterval(checkInterval); // Arrête l'intervalle si le travail a échoué
        }
      })
      .catch((error) => {
        console.error("Error checking task status:", error);
        setLoadingState(
          false,
          "Erreur de connexion. Vérifiez votre réseau ou réessayez."
        );
      });
  }

  // Fonction pour commencer à interroger le statut de la tâche
  function startTaskStatusCheck(jobId) {
    if (checkInterval) {
      clearInterval(checkInterval); // S'assure qu'aucun intervalle précédent ne tourne
    }
    checkInterval = setInterval(() => {
      checkTaskStatus(jobId);
    }, 2000);
  }

  // Variable pour stocker l'ID de l'intervalle
  let checkInterval = null;
  // ! FIN ASYNCHRINE

  // todo SEND REQUEST --------------------------

  // Envoie une requête au serveur
  function sendRequest(isVoice = false) {
    globalIsVoice = isVoice;
    setInteractionStarted(true);
    console.log("sendRequest called with isVoice:", isVoice);
    if (isRequestPending) return;
    setLoadingState(true);

    // Préparation des données à envoyer
    var formData = new FormData();
    var questionText = questionInput.value.trim(); // Assurez-vous que questionText est définie
    var file = fileInput.files.length > 0 ? fileInput.files[0] : null;

    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    }
    if (questionInput.value.trim().length > 0) {
      formData.append("question", questionInput.value.trim());
      addHistoryEntry(questionInput.value, "", "question");
    }

    // Ajoute la configuration GPT sélectionnée via les boutons radio

    const selectedConfig = document.querySelector(
      'input[name="config"]:checked'
    ).value;
    formData.append("config_key", selectedConfig);

    console.log("Config sélectionnée :", selectedConfig);

    // Décidez si la demande doit être synchrone ou asynchrone
    const isHeavy = evaluateRequestSize(questionText, file);
    const endpoint = isHeavy
      ? "https://kokua060424-caea7e92447d.herokuapp.com/ask"
      : "https://kokua060424-caea7e92447d.herokuapp.com/ask_sync";

    // Envoi de la requête au serveur et gestion des réponses
    fetch(endpoint, {
      method: "POST",
      body: formData,
      credentials: "include",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok " + response.statusText);
        }
        return response.json();
      })
      .then((data) => {
        if (isHeavy) {
          // Gérer la réponse pour la tâche asynchrone
          console.log("Session ID: ", data.session_id);
          console.log("TRAITEMENT ASYNCHRONE");
          startTaskStatusCheck(data.job_id);
        } else {
          // Gérer immédiatement la réponse pour la tâche synchrone
          console.log("TRAITEMENT SYNCHRONE");
          updateResponseContainer(data, isVoice);
          if (isVoice) {
            speak(data.response);
          }
          setLoadingState(false);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(
          "Une erreur s'est produite lors de la communication avec le serveur. Veuillez réessayer."
        );
        updateResponseContainer("Erreur lors de la requête.");
        setLoadingState(false);
      })
      .finally(() => {
        // setLoadingState(false);
        if (!isVoice) {
          questionInput.value = ""; // Efface le champ de texte si la requête n'est pas vocale
          if (fileInput.files.length > 0) {
            cancelButton.style.display = "none"; // Gère le bouton d'annulation correctement après l'envoi du fichier
          }
        }
      });
  }

  // todo FIN SEND REQUEST ----------------------

  // Écouteur d'événement sur le bouton 'stop' pour arrêter la synthèse vocale et réinitialiser les entrées
  stopButton.addEventListener("click", function () {
    synth.cancel(); // Arrête la synthèse vocale en cours
    questionInput.value = ""; // Efface le champ de saisie de la question

    // Marque que l'utilisateur a effectué une action vocale, important pour le gestionnaire d'état des boutons
    lastAction = "voice";

    setButtonStates(); // Met à jour l'état des boutons en fonction du contexte actuel
    this.style.display = "none"; // Cache le bouton stop une fois qu'il est cliqué
  });

  // Écouteur d'événement sur le bouton 'submit' pour envoyer une demande sans utilisation de la voix
  submitButton.addEventListener("click", () => sendRequest(false));

  // Écouteur d'événement sur le bouton de soumission de fichier
  fileSubmitButton.addEventListener("click", () => {
    sendRequest(false); // Envoie la demande sans utiliser la voix
    fileInput.value = ""; // Réinitialise le champ de fichier après l'envoi
    cancelButton.style.display = "none"; // Cache le bouton d'annulation après l'envoi du fichier
    costEstimate.style.display = "none"; // Cache le bouton d'annulation après l'envoi du fichier
    costEstimate.style.display = "none";
  });

  // Écouteur d'événement sur le bouton de microphone pour démarrer la reconnaissance vocale
  microButton.addEventListener("click", function () {
    this.classList.add("recording"); // Ajoute une classe CSS pour indiquer l'enregistrement
    recognition.start(); // Démarre la reconnaissance vocale
    stopButton.style.display = "block"; // Affiche le bouton stop lorsque la reconnaissance est active
  });

  // Gestionnaire pour le résultat de la reconnaissance vocale
  recognition.onresult = function (event) {
    var text = event.results[0][0].transcript; // Extrayez le texte reconnu
    questionInput.value = text; // Affiche le texte reconnu dans le champ de question
    sendRequest(true); // Envoie une requête avec la voix comme entrée
  };

  // Gestionnaire pour la fin de la reconnaissance vocale
  recognition.onend = function () {
    microButton.classList.remove("recording"); // Retire la classe d'enregistrement
    setButtonStates(); // Met à jour les états des boutons après la fin de l'enregistrement
  };

  // Initialisation des voix et écoute de la fin de la parole
  synth.onvoiceschanged = function () {
    var voices = synth.getVoices();
    // console.log(voices); // Affiche toutes les voix disponibles dans la console
    // voices.forEach((voice, index) => {
    //   console.log(`${index + 1}: ${voice.name} (${voice.lang})`);
    // });
  };

  // Écouteur pour la fin de la synthèse vocale, défini une seule fois
  synth.onend = function () {
    console.log("Speech synthesis has ended."); // Log pour diagnostic
    handleSpeechEnd();
  };

  function removeHtmlTags(text) {
    var doc = new DOMParser().parseFromString(text, "text/html");
    return doc.body.textContent || "";
  }

  // Utilisation avant de faire parler le synthétiseur vocal
  function speak(text) {
    var cleanText = removeHtmlTags(text); // Nettoyer le texte
    var utterThis = new SpeechSynthesisUtterance(cleanText);
    if (selectedVoice) {
      utterThis.voice = selectedVoice;
    }
    utterThis.onend = function () {
      console.log("Local speech synthesis has ended."); // Log de fin de parole
      handleSpeechEnd();
    };
    isSpeaking = true; // Mettre à jour l'état de parole
    synth.speak(utterThis);
    setButtonStates(); // Mise à jour des états des boutons immédiatement
  }

  // Fonction pour gérer la fin de la parole
  function handleSpeechEnd() {
    console.log("Handling speech end, updating button states."); // Log pour diagnostic
    stopButton.style.display = "none"; // Rend le bouton Arrêter invisible
    stopButton.disabled = true; // Désactive le bouton Arrêter
    // setButtonStates();
    microButton.disabled = false;
    questionInput.value = "";
    isSpeaking = false; // Réinitialiser l'état de parole
    setButtonStates(); // Mise à jour des états des boutons après la fin de la parole
  }

  // todo ESPACE EVALUATIONSYNCH ou ASYNCH -------------

  function evaluateRequestSize(questionText, file) {
    const textLength = questionText.trim().length;
    let fileSize = 0;
    if (file && file.size) {
      fileSize = file.size / 1024; // Taille du fichier en kilo-octets
    }

    // Définissez des seuils pour considérer une demande comme "lourde"
    const heavyTextLength = 100; // par exemple, plus de 1000 caractères
    const heavyFileSize = 10; // par exemple, plus de 500 KB

    return textLength > heavyTextLength || fileSize > heavyFileSize;
  }

  // todo FIN ESPACE EVALUATIONSYNCH ou ASYNCH ---------

  // todo ESPACE REINITIALISATION ----------------------
  // Fonction pour réinitialiser la session sur le serveur
  function resetSession() {
    fetch("https://kokua060424-caea7e92447d.herokuapp.com/reset-session", {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          console.log("Session réinitialisée avec succès."); // Log en cas de succès
        } else {
          console.error("Erreur lors de la réinitialisation de la session."); // Log en cas d'erreur
        }
      })
      .catch((error) => console.error("Erreur:", error)); // Log en cas d'erreur de réseau ou serveur
  }

  // Réinitialise l'interface utilisateur
  function resetUI() {
    questionInput.value = "";
    fileInput.value = "";
    updateResponseContainer(""); // Met à jour le conteneur de réponse, fonction non fournie
    cancelButton.style.display = "none";
    actionsContainer.style.display = "none";

    isSpeaking = false;

    lastAction = null;
    setButtonStates(); // Met à jour l'état des boutons, fonction non fournie
    resetSession(); // Appel à resetSession pour réinitialiser la session côté serveur
    responseContainer.style.display = "none";
    clearHistory(); // Vide l'historique et ajuste l'affichage

    // Décocher la case 'toggleHistoryCheckbox' et déclencher l'événement 'change'
    var toggleHistoryCheckbox = document.getElementById(
      "toggleHistoryCheckbox"
    );
    if (toggleHistoryCheckbox.checked) {
      toggleHistoryCheckbox.checked = false;
      toggleHistoryCheckbox.dispatchEvent(new Event("change"));
    }

    navigator.clipboard
      .writeText("")
      .then(() => console.log("Presse-papiers vidé avec succès"))
      .catch((err) =>
        console.error("Erreur lors du vidage du presse-papiers:", err)
      );
    copyButton.display = false;
    saveButton.display = false;
  }

  if (copyButton && saveButton) {
    copyButton.addEventListener("click", copyChatHistory);
    saveButton.addEventListener("click", saveChatHistory);
  } else {
    console.error("Buttons not found");
  }

  // Gestion des boutons radio pour un aspect interactif des consignes
  const radios = document.querySelectorAll('.zone-radio input[type="radio"]');
  radios.forEach((radio) => {
    radio.addEventListener("change", function () {
      radios.forEach((r) => r.parentNode.classList.remove("active"));
      if (radio.checked) {
        radio.parentNode.classList.add("active");
        instructionDiv.textContent = consignes[radio.value];
      }
    });
    if (radio.checked) {
      radio.parentNode.classList.add("active");
    }
    // Assurez-vous de déclencher l'événement 'change' après que tous les écouteurs sont en place
    document
      .querySelector('.zone-radio input[type="radio"]:checked')
      .dispatchEvent(new Event("change"));
  });
  // todo FIN ESPACE REINITIALISATION ------------------

  resetUI();
});
