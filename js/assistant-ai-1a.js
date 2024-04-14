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
      }
    });
    if (radio.checked) {
      radio.parentNode.classList.add("active");
    }
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
  }

  // Met à jour le contenu du conteneur de réponse et gère l'affichage des actions associées.
  function updateResponseContainer(content) {
    // Sélection des conteneurs de réponse et d'actions dans le DOM
    var responseContainer = document.getElementById("assistant1a-response");
    var actionsContainer = document.getElementById("response-actions");

    // Vérifie si le contenu est vide ou non
    if (content.trim() === "") {
      // Cache les conteneurs si le contenu est vide
      responseContainer.style.display = "none";
      actionsContainer.style.display = "none";
    } else {
      // Affiche et met à jour les conteneurs avec le nouveau contenu si ce dernier n'est pas vide
      responseContainer.innerHTML = content;
      responseContainer.style.display = "block";
      actionsContainer.style.display = "block";
    }
    // Met à jour l'état des boutons (commenté ici, à décommenter si utilisé)
    // setButtonStates();
  }

  // Met à jour les états des boutons en fonction des conditions spécifiques
  function setButtonStates() {
    // Vérifie la présence de fichiers, de texte et si la synthèse vocale est active
    let hasFile = fileInput.files.length > 0;
    let hasText = questionInput.value.trim().length > 0;
    let isSpeaking = synth.speaking;

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
        updateResponseContainer(data.response);
        if (isVoice) {
          speak(data.response); // Fonction pour activer la synthèse vocale (non fournie ici)
        }
        if (!isVoice && fileInput.files.length > 0) {
          cancelButton.style.display = "none";
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert(
          "Une erreur s'est produite lors de la communication avec le serveur. Veuillez réessayer."
        ); // Notifie l'utilisateur
        updateResponseContainer("Erreur lors de la requête.");
      })
      .finally(() => {
        if (!isVoice) {
          questionInput.value = ""; // Efface le champ de texte si la requête n'est pas vocale
        }
        setLoadingState(false);
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

  // Fonction pour faire parler l'assistant avec le texte donné
  function speak(text) {
    var utterThis = new SpeechSynthesisUtterance(text); // Prépare le texte pour la synthèse
    synth.speak(utterThis); // Fait parler le synthétiseur
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
