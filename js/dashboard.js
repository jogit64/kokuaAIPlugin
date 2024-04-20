document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("assistant1a-file");
  const tokenInputDisplay = document.getElementById("token-input");
  const tokenOutputDisplay = document.getElementById("token-output");
  const tokenTotalDisplay = document.getElementById("token-total");
  const costEstimatedDisplay = document.getElementById("cost-estimated");
  const qualityDisplay = document.getElementById("quality");

  const maxTokens = 4000; // Limite maximale de tokens comme configuré dans votre fichier JSON
  const conversionRate = 1 / 1.07; // Taux de conversion de USD à EUR
  const costPerTokenInputUSD = 30.0 / 1000000; // Coût par token en USD pour l'input
  const costPerTokenOutputUSD = 60.0 / 1000000; // Coût par token en USD pour l'output

  fileInput.addEventListener("change", function () {
    if (this.files.length > 0) {
      const file = this.files[0];
      analyzeFile(file);
    }
  });

  function analyzeFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      const inputTokens = estimateTokens(content);
      const outputTokens = estimateOutputTokens(inputTokens); // Estime les tokens de sortie basée sur la règle de 50% de l'input
      const totalTokens = inputTokens + outputTokens;
      const costInUSD = calculateCostInUSD(inputTokens, outputTokens);
      const costInEUR = convertToEUR(costInUSD);
      const quality = evaluateQuality(totalTokens, maxTokens);
      updateDisplay(inputTokens, outputTokens, totalTokens, costInEUR, quality);
    };
    reader.readAsText(file);
  }

  function estimateTokens(text) {
    return text.split(/\s+/).length; // Estimation simple du nombre de mots comme tokens
  }

  function estimateOutputTokens(inputTokens) {
    return Math.min(inputTokens * 0.5, maxTokens - inputTokens); // Estimation simplifiée de l'output, ajustée pour ne pas dépasser maxTokens
  }

  function calculateCostInUSD(inputTokens, outputTokens) {
    const inputCost = inputTokens * costPerTokenInputUSD;
    const outputCost = outputTokens * costPerTokenOutputUSD;
    return inputCost + outputCost; // Coût total pour input et output
  }

  function convertToEUR(costInUSD) {
    return costInUSD * conversionRate; // Convertit le coût de USD en EUR
  }

  function evaluateQuality(totalTokens, maxTokens) {
    if (totalTokens <= maxTokens) {
      return "Haute"; // La qualité est haute si on ne dépasse pas la limite
    } else if (totalTokens > maxTokens && totalTokens <= maxTokens * 1.1) {
      return "Moyenne"; // Qualité moyenne si légèrement au-dessus de la limite
    } else {
      return "Basse"; // Qualité basse si bien au-dessus de la limite
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
