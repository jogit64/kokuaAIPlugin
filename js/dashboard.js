document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("assistant1a-file");
  const tokenInputDisplay = document.getElementById("token-input");
  const tokenOutputDisplay = document.getElementById("token-output");
  const tokenTotalDisplay = document.getElementById("token-total");
  const costEstimatedDisplay = document.getElementById("cost-estimated");
  const qualityDisplay = document.getElementById("quality");

  const maxTokens = 4000;
  const conversionRate = 1 / 1.07;
  const costPerTokenInputUSD = 30.0 / 1000000;
  const costPerTokenOutputUSD = 60.0 / 1000000;

  if (typeof pdfjsLib !== "undefined") {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.min.js";
  } else {
    console.error("PDF.js n'est pas chargé.");
  }

  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      const file = this.files[0];
      if (/\.pdf$/i.test(file.name)) {
        analyzePDF(file);
      } else {
        analyzeFile(file);
      }
    }
  });

  function analyzeFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      processContent(content);
    };
    reader.onerror = function (e) {
      console.error("Erreur de lecture du fichier : ", e.target.error.message);
    };
    reader.readAsText(file);
  }

  function analyzePDF(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const typedarray = new Uint8Array(e.target.result);
      pdfjsLib
        .getDocument(typedarray)
        .promise.then(function (pdfDoc) {
          return pdfDoc.getPage(1);
        })
        .then(function (page) {
          return page.getTextContent();
        })
        .then(function (textContent) {
          let text = "";
          textContent.items.forEach(function (item) {
            text += item.str + " ";
          });
          processContent(text);
        });
    };
    reader.onerror = function (e) {
      console.error(
        "Erreur de lecture du fichier PDF : ",
        e.target.error.message
      );
    };
    reader.readAsArrayBuffer(file);
  }

  function processContent(content) {
    const inputTokens = estimateTokens(content);
    const instructionTokens = estimateInstructionTokens(); // Estime les tokens pour les instructions
    const outputTokens = estimateOutputTokens(inputTokens);
    const totalTokens = inputTokens + outputTokens + instructionTokens;
    const costInUSD = calculateCostInUSD(inputTokens, outputTokens);
    const costInEUR = convertToEUR(costInUSD);
    const quality = evaluateQuality(totalTokens, maxTokens);
    updateDisplay(inputTokens, outputTokens, totalTokens, costInEUR, quality);
  }

  function estimateTokens(text) {
    // return text.split(/\s+/).length;
    const tokens = text.match(/[\w']+|[\s.,!?;]/g);
    return tokens ? tokens.length : 0;
  }

  // Mise à jour de la fonction pour mieux refléter la complexité des instructions
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
    if (totalTokens <= maxTokens) {
      return "Haute";
    } else if (totalTokens > maxTokens && totalTokens <= maxTokens * 1.1) {
      return "Moyenne";
    } else {
      return "Basse";
    }
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
  }
});
