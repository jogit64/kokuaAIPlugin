document.addEventListener("DOMContentLoaded", function () {
  var allButtons = document.querySelectorAll("button");
  var microButton = document.getElementById("assistant1a-record");
  var stopButton = document.getElementById("assistant1a-stop");
  var submitButton = document.getElementById("assistant1a-submit");
  var fileSubmitButton = document.getElementById("assistant1a-file-submit");
  var fileInput = document.getElementById("assistant1a-file");
  var questionInput = document.getElementById("assistant1a-question");
  var resetButton = document.getElementById("assistant1a-reset");
  var indicator = document.getElementById("assistant1a-file-upload-status");
  var synth = window.speechSynthesis;
  var recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  var isRequestPending = false;
  var lastAction = null; // 'voice', 'text', 'file'
  recognition.lang = "fr-FR";
  recognition.continuous = false;

  var copyButton = document.getElementById("copyButton");
  var saveButton = document.getElementById("saveButton");

  if (copyButton && saveButton) {
    copyButton.addEventListener("click", copyChatHistory);
    saveButton.addEventListener("click", saveChatHistory);
  } else {
    console.error("Buttons not found");
  }

  // todo ici gestion boutons radio
  const radios = document.querySelectorAll('.zone-radio input[type="radio"]');
  radios.forEach((radio) => {
    // Écouter les changements sur les radios
    radio.addEventListener("change", function () {
      // Retirer la classe 'active' de tous les labels
      radios.forEach((r) => r.parentNode.classList.remove("active"));
      // Ajouter la classe 'active' au label du radio sélectionné
      if (radio.checked) {
        radio.parentNode.classList.add("active");
      }
    });
    // Appliquer la classe 'active' sur le label du radio déjà coché lors du chargement
    if (radio.checked) {
      radio.parentNode.classList.add("active");
    }
  });
  // todo fin bouton radio

  // todo bouton copie sauvegarde contenu

  function copyChatHistory(event) {
    event.preventDefault(); // Empêche la soumission du formulaire
    const responseText = document.getElementById(
      "assistant1a-response"
    ).innerText;
    navigator.clipboard
      .writeText(responseText)
      .then(() => alert("L'échange a été copié dans le presse-papiers"))
      .catch((err) => console.error("Erreur lors de la copie:", err));
  }

  function saveChatHistory(event) {
    event.preventDefault(); // Empêche la soumission du formulaire
    const responseText = document.getElementById(
      "assistant1a-response"
    ).innerText;
    const blob = new Blob([responseText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "response.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // todo fin bouton copie contenu

  // var responseContainer = document.getElementById("assistant1a-response");

  var cancelButton = document.createElement("button");
  cancelButton.textContent = "Annuler le choix du fichier";
  cancelButton.id = "assistant1a-cancel-file";
  cancelButton.className = "custom-button";
  cancelButton.style.display = "none"; // Caché par défaut
  document.getElementById("assistant1a-file-section").appendChild(cancelButton);

  cancelButton.addEventListener("click", function () {
    fileInput.value = ""; // Réinitialise le choix du fichier
    this.style.display = "none"; // Cache le bouton d'annulation
    setButtonStates(); // Met à jour l'état des boutons
  });

  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      cancelButton.style.display = "block";
      lastAction = "file";
      setButtonStates();
    }
  });

  function resetUI() {
    questionInput.value = "";
    fileInput.value = "";
    // responseContainer.innerHTML = "";
    updateResponseContainer("");
    cancelButton.style.display = "none";
    lastAction = null;
    setButtonStates();
  }
  function updateResponseContainer(content) {
    var responseContainer = document.getElementById("assistant1a-response");
    var actionsContainer = document.getElementById("response-actions");
    if (content.trim() === "") {
      responseContainer.style.display = "none";
      actionsContainer.style.display = "none";
    } else {
      responseContainer.innerHTML = content;
      responseContainer.style.display = "block";
      actionsContainer.style.display = "block";
    }
    // setButtonStates();
  }

  function setButtonStates() {
    let hasFile = fileInput.files.length > 0;
    let hasText = questionInput.value.trim().length > 0;
    let isSpeaking = synth.speaking;

    allButtons.forEach((btn) => (btn.disabled = true)); // Désactive tous les boutons par défaut
    if (!isRequestPending) {
      microButton.disabled = hasFile || isSpeaking; // Active le micro si aucun fichier n'est sélectionné et pas en train de parler
      submitButton.disabled = hasFile || !hasText || isSpeaking; // Active soumettre si du texte est présent et pas en train de parler ou un fichier est sélectionné
      fileSubmitButton.disabled = !hasFile || isSpeaking; // Active envoyer fichier si un fichier est sélectionné
      cancelButton.style.display = hasFile ? "block" : "none"; // Affiche le bouton d'annulation si un fichier est sélectionné
    }
    stopButton.disabled = !isSpeaking; // Active le bouton arrêter seulement si la synthèse est en cours
    resetButton.disabled = lastAction === null && !isSpeaking; // Active réinitialiser si une action a été effectuée ou en train de parler

    // Activer les boutons de copie et de sauvegarde si des réponses sont présentes
    var responseText = document.getElementById(
      "assistant1a-response"
    ).innerText;
    if (responseText.trim().length > 0) {
      copyButton.disabled = false;
      saveButton.disabled = false;
    }
  }

  questionInput.addEventListener("input", () => {
    lastAction = "text";
    setButtonStates();
  });

  resetButton.addEventListener("click", resetUI);

  function setLoadingState(isLoading) {
    isRequestPending = isLoading;
    indicator.style.display = isLoading ? "block" : "none";
    setButtonStates();
  }

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

    fetch("https://kokua060424-caea7e92447d.herokuapp.com/ask", {
      method: "POST",
      body: formData,
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        // responseContainer.innerHTML = data.response;
        updateResponseContainer(data.response);
        if (isVoice) {
          speak(data.response);
        }
        // Hide cancelButton after file is sent
        if (!isVoice && fileInput.files.length > 0) {
          cancelButton.style.display = "none";
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        // responseContainer.innerHTML = "Erreur lors de la requête.";
        updateResponseContainer("Erreur lors de la requête.");
      })
      .finally(() => {
        if (!isVoice) {
          questionInput.value = ""; // Vide l'input si la requête n'est pas vocale
        }
        setLoadingState(false);
      });
  }

  stopButton.addEventListener("click", function () {
    synth.cancel(); // Arrête la synthèse vocale
    questionInput.value = ""; // Vide l'input de la question

    // Indique qu'une action a été effectuée pour activer le resetButton
    lastAction = "voice"; // Ou utilisez une valeur appropriée qui indique une session active

    setButtonStates(); // Met à jour l'état des boutons
    this.style.display = "none"; // Cache le stopButton
  });

  submitButton.addEventListener("click", () => sendRequest(false));

  fileSubmitButton.addEventListener("click", () => {
    sendRequest(false);
    fileInput.value = ""; // Réinitialise le champ de fichier après l'envoi
    cancelButton.style.display = "none"; // Cache immédiatement le bouton d'annulation
  });

  microButton.addEventListener("click", function () {
    this.classList.add("recording");
    recognition.start();
    stopButton.style.display = "block"; // Ajoutez cette ligne pour afficher le stopButton
  });

  recognition.onresult = function (event) {
    var text = event.results[0][0].transcript;
    questionInput.value = text;
    sendRequest(true);
  };

  recognition.onend = function () {
    microButton.classList.remove("recording");
    setButtonStates();
  };

  document
    .getElementById("assistant1a-stop")
    .addEventListener("click", function () {
      synth.cancel();
    });

  function speak(text) {
    var utterThis = new SpeechSynthesisUtterance(text);
    synth.speak(utterThis);
  }

  function resetSession() {
    // Implémentez la logique pour réinitialiser la session côté serveur ici
    // Cela peut être un appel fetch à un endpoint qui gère la réinitialisation
    fetch("https://kokua060424-caea7e92447d.herokuapp.com/reset-session", {
      method: "POST",
      credentials: "include",
    })
      .then((response) => {
        if (response.ok) {
          console.log("Session réinitialisée avec succès.");
        } else {
          console.error("Erreur lors de la réinitialisation de la session.");
        }
      })
      .catch((error) => console.error("Erreur:", error));
  }

  resetUI(); // Initialise l'UI au chargement
});
