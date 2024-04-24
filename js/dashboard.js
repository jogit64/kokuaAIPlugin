document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("assistant1a-file");
  const tokenInputDisplay = document.getElementById("token-input");
  const tokenOutputDisplay = document.getElementById("token-output");
  const tokenTotalDisplay = document.getElementById("token-total");
  const costEstimatedDisplay = document.getElementById("cost-estimated");
  const qualityDisplay = document.getElementById("quality");

  let maxTokens = 4000; // Valeur initiale par défaut, sera mise à jour dynamiquement
  const conversionRate = 1 / 1.07;
  const costPerTokenInputUSD = 10.0 / 1000000;
  const costPerTokenOutputUSD = 30.0 / 1000000;
  let currentContent = null; // Pour stocker le contenu actuel et retraiter si nécessaire

  // Chargement initial des configurations
  fetchConfigurations();

  // Écouter les changements sur les boutons radio
  document
    .querySelectorAll('input[type="radio"][name="config"]')
    .forEach((radio) => {
      radio.addEventListener("change", function () {
        if (this.checked) {
          updateConfig(this.value);
        }
      });
    });

  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      const file = this.files[0];
      currentContent = null; // Réinitialiser le contenu actuel
      const fileHandler = file.name.endsWith(".pdf") ? analyzePDF : analyzeFile;
      fileHandler(file);
    }
  });

  function fetchConfigurations() {
    fetch(dashboardSettings.baseUrl + "data/gpt_config.json")
      .then((response) => response.json())
      .then((data) => {
        configurations = data;
        const initialConfig = document.querySelector(
          'input[name="config"]:checked'
        ).value;
        updateConfig(initialConfig);
      })
      .catch((error) => console.error("Error loading JSON:", error));
  }

  function updateConfig(configType) {
    const config = configurations[configType];
    maxTokens = config.max_tokens;
    const maxTokensDisplay = document.getElementById("max-tokens-display");

    if (maxTokensDisplay) {
      maxTokensDisplay.textContent = `Max tokens: ${maxTokens}`;
      maxTokensDisplay.style.color = "white";
      if (currentContent) {
        processContent(currentContent);
      }
    } else {
      console.error("Element '#max-tokens-display' not found.");
    }
  }

  function analyzeFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentContent = e.target.result;
      processContent(currentContent);
    };
    reader.onerror = (e) =>
      console.error("Erreur de lecture du fichier : ", e.target.error.message);
    reader.readAsText(file);
  }

  function analyzePDF(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const typedarray = new Uint8Array(e.target.result);
      pdfjsLib
        .getDocument(typedarray)
        .promise.then((pdfDoc) => pdfDoc.getPage(1))
        .then((page) => page.getTextContent())
        .then((textContent) => {
          currentContent = textContent.items.map((item) => item.str).join(" ");
          processContent(currentContent);
        });
    };
    reader.onerror = (e) =>
      console.error(
        "Erreur de lecture du fichier PDF : ",
        e.target.error.message
      );
    reader.readAsArrayBuffer(file);
  }

  function processContent(content) {
    const inputTokens = estimateTokens(content);
    const instructionTokens = estimateInstructionTokens();
    const outputTokens = estimateOutputTokens(inputTokens);
    const totalTokens = inputTokens + outputTokens + instructionTokens;
    const costInUSD = calculateCostInUSD(inputTokens, outputTokens);
    const costInEUR = convertToEUR(costInUSD);
    const quality = evaluateQuality(totalTokens, maxTokens);
    updateDisplay(inputTokens, outputTokens, totalTokens, costInEUR, quality);
  }

  function updateDisplay(
    inputTokens,
    outputTokens,
    totalTokens,
    costInEUR,
    quality
  ) {
    tokenInputDisplay.textContent = inputTokens;
    tokenOutputDisplay.textContent = outputTokens;
    tokenTotalDisplay.textContent = totalTokens;
    costEstimatedDisplay.textContent = `€${costInEUR.toFixed(2)}`;
    qualityDisplay.textContent = quality;
    updateProgressBar(totalTokens, maxTokens);
  }

  function updateProgressBar(totalTokens, maxTokens) {
    const percentage = (totalTokens / maxTokens) * 100;
    const progressBar = document.getElementById("token-progress");
    progressBar.style.width = percentage + "%";
    progressBar.style.backgroundColor =
      percentage < 75 ? "#4CAF50" : percentage < 90 ? "#FFEB3B" : "#F44336";
    document.getElementById(
      "token-status"
    ).textContent = `Utilisation de ${Math.round(
      totalTokens
    )} sur ${maxTokens} tokens (${Math.round(percentage)}%)`;
    tokenStatus.style.color = "white";
  }

  function estimateTokens(text) {
    const tokens = text.match(/[\w']+|[\s.,!?;]/g);
    return tokens ? tokens.length : 0;
  }

  function estimateInstructionTokens() {
    const instructions = `Tu es expert en prévention des risques professionnels... Mentionne en titre de ta réponse le nom du document et le cas échéant sa date de réalisation.`;
    return estimateTokens(instructions);
  }

  function estimateOutputTokens(inputTokens) {
    return Math.min(inputTokens * 0.5, maxTokens - inputTokens);
  }

  function calculateCostInUSD(inputTokens, outputTokens) {
    const inputCost = inputTokens * costPerTokenInputUSD;
    const outputCost = outputTokens * costPerTokenOutputUSD;
    return inputCost + outputCost;
  }

  function convertToEUR(costInUSD) {
    return costInUSD * conversionRate;
  }

  function evaluateQuality(totalTokens, maxTokens) {
    const usageRatio = totalTokens / maxTokens;
    if (usageRatio <= 0.75) {
      return "Haute";
    } else if (usageRatio <= 0.9) {
      return "Moyenne";
    } else {
      return "Basse";
    }
  }
});
