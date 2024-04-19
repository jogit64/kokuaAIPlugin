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
    updateResponseContainer(""); // Met à jour le conteneur de réponse, fonction non fournie
    cancelButton.style.display = "none";
    lastAction = null;
    setButtonStates(); // Met à jour l'état des boutons, fonction non fournie
    resetSession(); // Appel à resetSession pour réinitialiser la session côté serveur

    // Décocher la case 'toggleHistoryCheckbox' et déclencher l'événement 'change'
    var toggleHistoryCheckbox = document.getElementById(
      "toggleHistoryCheckbox"
    );
    if (toggleHistoryCheckbox.checked) {
      toggleHistoryCheckbox.checked = false;
      toggleHistoryCheckbox.dispatchEvent(new Event("change"));
    }

    // Maintenant, effacez l'historique après avoir manipulé l'état de la checkbox
    clearHistory(); // Vide l'historique et ajuste l'affichage
  }

  // Ajout d'une nouvelle fonction pour effacer l'historique
  function clearHistory() {
    var historyContainer = document.getElementById("assistant1a-history");
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
  var historyContainer = document.getElementById("assistant1a-history");
  var isFirstExchange = true;
  var toggleHistoryCheckbox = document.getElementById("toggleHistoryCheckbox");

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
    // Vérifier si les données sont vides ou non valides avant de continuer
    if (!data || data === "" || Object.keys(data).length === 0) {
      console.log("No valid data provided to updateResponseContainer.");
      return; // Retourne immédiatement si aucune donnée valide n'est fournie
    }
    console.log("Received data:", JSON.stringify(data, null, 2)); // Afficher les données de manière lisible

    let content = "";

    // Vérifier le statut et extraire le contenu approprié
    if (data && data.status === "finished" && data.response !== undefined) {
      // content = data.response; // Accéder directement à la réponse si la tâche est terminée
      content = removeJsonArtifacts(data.response); // Nettoyer les artefacts JSON
    } else if (data && data.status === "failed") {
      console.error("Job failed:", data.error, data.details);
      content = "Erreur de traitement : " + data.error;
    } else if (data && data.status === "processing") {
      console.log("Job is still processing.");
      content = "Traitement en cours...";
    } else {
      console.error("Unexpected data structure:", data);
      content = "Réponse inattendue du serveur.";
    }

    // // Si la réponse est bien une chaîne mais contient des caractères de format JSON, nettoyez-la
    // if (typeof content === "string") {
    //   content = removeJsonArtifacts(content);
    // } else {
    //   content = JSON.stringify(content); // Convertir l'objet en chaîne si nécessaire
    // }

    var formattedContent = formatLists(content); // Formate les listes si nécessaire
    var responseContainer = document.getElementById("assistant1a-response");
    var questionText = document
      .getElementById("assistant1a-question")
      .value.trim();
    var actionsContainer = document.getElementById("response-actions");
    var historyContainer = document.getElementById("assistant1a-history");

    // Affiche la réponse actuelle dans le conteneur de réponse
    if (formattedContent.trim() !== "") {
      responseContainer.innerHTML = formattedContent;
      responseContainer.style.display = "block";
      actionsContainer.style.display = "block";
    } else {
      responseContainer.style.display = "none";
      actionsContainer.style.display = "none";
    }

    // Ajoute la question à l'historique, sans préfixe dans le texte
    if (questionText && !isFirstExchange) {
      addHistoryEntry(questionText, "", "question");
    }

    // Ajoute la réponse à l'historique, sans préfixe dans le texte
    if (formattedContent.trim() !== "" && !isFirstExchange) {
      addHistoryEntry("", formattedContent, "response");
    }

    // Le premier échange est maintenant passé, on actualise l'indicateur
    isFirstExchange = false;
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

  // !début vision

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
    }, 5000); // Interval peut être ajusté selon les besoins
  }

  // !fin vision

  // Envoie une requête au serveur
  function sendRequest(isVoice = false) {
    if (isRequestPending) return;
    setLoadingState(true);

    // Préparation des données à envoyer
    var formData = new FormData();
    if (fileInput.files.length > 0) {
      formData.append("file", fileInput.files[0]);
    }
    if (questionInput.value.trim().length > 0) {
      formData.append("question", questionInput.value.trim());
    }

    // Ajoute la configuration GPT sélectionnée via les boutons radio
    const selectedConfig = document.querySelector(
      'input[name="config"]:checked'
    ).value;
    formData.append("config", selectedConfig);

    // Envoi de la requête au serveur et gestion des réponses
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
          updateResponseContainer(data);
          if (isVoice) {
            speak(data.response); // Continuez à gérer la synthèse vocale si nécessaire
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
          questionInput.value = ""; // Efface le champ de texte si la requête n'est pas vocale
          if (fileInput.files.length > 0) {
            cancelButton.style.display = "none"; // Gère le bouton d'annulation correctement après l'envoi du fichier
          }
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
