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

  const consignes = {
    salarie: "Copiez et collez l'entretien ou importez un fichier (DOC, DOCX).",
    direction:
      "Copiez et collez l'entretien ou importez un fichier (DOC, DOCX).",
    document: "Importez le fichier (PDF) à analyser pour cette session.",
    mp3: "Utilisez l'importation de fichier pour partager l'enregistrement MP3 à transcrire.",
    discussion:
      "Utilisez cet espace pour discuter de la rédaction et de la structuration de votre rapport.",
  };

  const instructionDiv = document.getElementById("instructionText");

  // Initialisation des variables d'état
  var isRequestPending = false; // Assurez-vous que cette variable est bien initialisée
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

  if (copyButton && saveButton) {
    copyButton.addEventListener("click", copyChatHistory);
    saveButton.addEventListener("click", saveChatHistory);
  } else {
    console.error("Buttons not found");
  }

  // Gestion des boutons radio pour un aspect interactif
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

  // Fonction pour copier l'historique du chat dans le presse-papiers
  function copyChatHistory(event) {
    event.preventDefault(); // Empêche l'action par défaut du navigateur
    const responseText = document.getElementById(
      "assistant1a-response"
    ).innerText;
    navigator.clipboard
      .writeText(responseText)
      .then(() => alert("L'échange a été copié dans le presse-papiers"))
      .catch((err) => console.error("Erreur lors de la copie:", err));
  }

  // Fonction pour sauvegarder l'historique du chat sur le disque local
  function saveChatHistory(event) {
    event.preventDefault();
    const responseText = document.getElementById(
      "assistant1a-response"
    ).innerText;
    const blob = new Blob([responseText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "response.txt";
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Crée un bouton pour annuler le choix du fichier
  var cancelButton = document.createElement("button");
  cancelButton.textContent = "Annuler le choix du fichier";
  cancelButton.id = "assistant1a-cancel-file";
  cancelButton.className = "custom-button";
  cancelButton.style.display = "none";
  document.getElementById("assistant1a-file-section").appendChild(cancelButton);

  // Gestion de l'annulation de la sélection d'un fichier
  cancelButton.addEventListener("click", function () {
    fileInput.value = ""; // Réinitialise le choix du fichier
    this.style.display = "none"; // Cache le bouton d'annulation
    setButtonStates(); // Met à jour l'état des boutons, fonction non fournie
  });

  // Gestion de la sélection de fichier
  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      cancelButton.style.display = "block";
      lastAction = "file";
      setButtonStates(); // Met à jour l'état des boutons, fonction non fournie
    }
  });

  // Réinitialise l'interface utilisateur
  function resetUI() {
    questionInput.value = "";
    fileInput.value = "";
    // isFirstExchange = true;
    // updateResponseContainer(""); // Met à jour le conteneur de réponse, fonction non fournie
    updateResponseContainer({ response: { response: "" } });
    cancelButton.style.display = "none";
    lastAction = null;
    setButtonStates(); // Met à jour l'état des boutons, fonction non fournie
    resetSession(); // Appel à resetSession pour réinitialiser la session côté serveur
    clearHistory(); // Ajout pour vider l'historique
  }

  // Ajout d'une nouvelle fonction pour effacer l'historique
  function clearHistory() {
    var historyContainer = document.getElementById("assistant1a-history");
    historyContainer.innerHTML = ""; // Efface le contenu de l'historique
    historyContainer.style.display = "none";
  }

  function formatLists(text) {
    // Regex pour détecter les lignes commençant par des tirets
    return text.replace(/^-\s(.*)/gm, "<ul><li>$1</li></ul>");
  }

  // Gestion de la checkbox pour afficher l'historique
  var historyContainer = document.getElementById("assistant1a-history");
  //  !suppr isFirstExchange
  // var isFirstExchange = true;
  var toggleHistoryCheckbox = document.getElementById("toggleHistoryCheckbox");
  console.log("Checkbox Checked Initial State:", toggleHistoryCheckbox.checked);

  // Initialise l'affichage de l'historique en fonction de l'état initial de la case à cocher
  historyContainer.style.display = toggleHistoryCheckbox.checked
    ? "block"
    : "none";

  // Gestionnaire pour la case à cocher
  toggleHistoryCheckbox.addEventListener("change", function () {
    historyContainer.style.display = this.checked ? "block" : "none";
  });

  // Met à jour le contenu du conteneur de réponse et gère l'affichage des actions associées.
  function updateResponseContainer(data) {
    let content = data.response.response; // Assurez-vous que data.response contient le HTML à afficher
    var formattedContent = formatLists(content); // Formate les listes si nécessaire
    var responseContainer = document.getElementById("assistant1a-response");
    var questionText = document
      .getElementById("assistant1a-question")
      .value.trim();
    console.log("Question Text:", questionText); // Ajout pour diagnostic
    var actionsContainer = document.getElementById("response-actions");
    var historyContainer = document.getElementById("assistant1a-history"); // Accès au conteneur d'historique

    // Affiche la réponse actuelle dans le conteneur de réponse
    if (formattedContent.trim() !== "") {
      responseContainer.innerHTML = formattedContent;
      responseContainer.style.display = "block";
      actionsContainer.style.display = "block";
      historyContainer.style.display = "block"; // Assurez-vous que l'historique est visible

      // Ajoute la réponse à l'historique
      addHistoryEntry("", formattedContent, "response");
    } else {
      responseContainer.style.display = "none";
      actionsContainer.style.display = "none";
    }

    // Ajoute la question à l'historique si elle existe
    if (questionText) {
      addHistoryEntry(questionText, "", "question");
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

    var historyContainer = document.getElementById("assistant1a-history");
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
    resetButton.disabled = lastAction === null && !isSpeaking;

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
  function setLoadingState(isLoading) {
    isRequestPending = isLoading;
    indicator.style.display = isLoading ? "block" : "none";
    setButtonStates();
  }

  // Fonction pour vérifier l'état d'une tâche en arrière-plan
  function checkTaskStatus(jobId) {
    fetch(`https://kokua060424-caea7e92447d.herokuapp.com/results/${jobId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        console.log("Task Status:", data);
        if (data.status === "finished" || data.status === "failed") {
          clearInterval(checkInterval);
          checkInterval = null; // Réinitialiser checkInterval après avoir arrêté l'intervalle
          if (data.status === "finished") {
            updateResponseContainer(data);
          } else {
            alert("Task failed: " + data.error);
          }
        }
      })
      .catch((error) => {
        console.error("Error checking task status:", error);
        clearInterval(checkInterval);
        checkInterval = null; // Réinitialiser checkInterval aussi ici après avoir arrêté l'intervalle
      });
  }

  // Variable pour stocker l'ID de l'intervalle
  let checkInterval;

  // Fonction pour commencer à interroger le statut de la tâche
  function startTaskStatusCheck(jobId) {
    if (checkInterval !== null) {
      clearInterval(checkInterval); // S'assure qu'aucun intervalle précédent ne tourne
    }
    checkInterval = setInterval(() => {
      checkTaskStatus(jobId);
    }, 5000);
  }

  // Envoie une requête au serveur
  function sendRequest(isVoice = false) {
    if (isRequestPending) return;
    setLoadingState(true);

    var formData = new FormData();
    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    }
    if (questionInput.value.trim().length > 0) {
      formData.append("question", questionInput.value.trim());
    }

    const selectedConfig = document.querySelector(
      'input[name="config"]:checked'
    ).value;
    formData.append("config", selectedConfig);

    fetch("https://kokua060424-caea7e92447d.herokuapp.com/ask", {
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
        if (data.job_id) {
          startTaskStatusCheck(data.job_id); // Démarrez la vérification de l'état avec l'ID de job obtenu
        } else {
          updateResponseContainer(data.response);
          if (isVoice) {
            speak(data.response);
          }
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(
          "Une erreur s'est produite lors de la communication avec le serveur. Veuillez réessayer."
        );
        updateResponseContainer("Erreur lors de la requête.");
      })
      .finally(() => {
        setLoadingState(false);
        if (!isVoice) {
          questionInput.value = ""; // Effacer le champ de texte si la requête n'est pas vocale
        }
      });
  }

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
    synth.speak(utterThis);
  }

  // Fonction pour gérer la fin de la parole
  function handleSpeechEnd() {
    console.log("Handling speech end, updating button states."); // Log pour diagnostic
    stopButton.style.display = "none"; // Rend le bouton Arrêter invisible
    stopButton.disabled = true; // Désactive le bouton Arrêter
    // setButtonStates();
    microButton.disabled = false;
    questionInput.value = "";
  }

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

  // Appel à la fonction pour réinitialiser l'interface utilisateur lors du chargement de la page
  resetUI();
});
