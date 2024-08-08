/**
 * Function to fetch suggestions for a parameter based on user input.
 * @param {string} reportname - The name of the report.
 * @param {string} param - The name of the parameter.
 * @param {string} input - The user input for the parameter.
 */
async function fetchSuggestions(reportname, param, input) {
  // Get the div to display the results for the current parameter
  const resultsDiv = document.getElementById(`${param}-results`);
  // Clear the results if the input is empty
  if (input.length < 1) {
    resultsDiv.innerHTML = "";
    return;
  }
  // Create a FormData object and append the parameter name and user input
  const formData = new FormData(document.getElementById("reportForm"));
  formData.append("param", param);
  formData.append("input", input);

  try {
    // Construct the URL with query parameters from the FormData object
    const url = `/api/report/${reportname}/suggestions?${new URLSearchParams(
      formData
    ).toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    // Check if the data contains an array of suggestions
    if (Array.isArray(data.suggestions)) {
      // Generate HTML for suggestions and display them
      resultsDiv.innerHTML = data.suggestions
        .map(
          (suggestion) =>
            `<p onclick="selectSuggestion('${param}', '${suggestion}')">${suggestion}</p>`
        )
        .join("");
    } else {
      resultsDiv.innerHTML = `<p class="error">Invalid data format: expected an array of suggestions.</p>`;
    }
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    resultsDiv.innerHTML = `<p class="error">An error occurred while fetching suggestions.</p>`;
  }
}

/**
 * Function to select a suggestion for a parameter.
 * @param {string} param - The name of the parameter.
 * @param {string} suggestion - The selected suggestion.
 */
function selectSuggestion(param, suggestion) {
  // Set the input field value to the selected suggestion
  document.getElementById(param).value = suggestion;
  // Clear the suggestions display
  document.getElementById(`${param}-results`).innerHTML = "";
}
