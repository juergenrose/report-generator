//function to fetch suggestions for a parameter based on user input
async function fetchSuggestions(reportname, param, input) {
  //get the div to display the results for the current parameter
  const resultsDiv = document.getElementById(`${param}-results`);
  //clear the results if the input is empty
  if (input.length < 1) {
    resultsDiv.innerHTML = "";
    return;
  }
  //create a FormData object and append the parameter name and user input
  const formData = new FormData(document.getElementById("reportForm"));
  formData.append("param", param);
  formData.append("input", input);

  try {
    //construct the URL with query parameters from the FormData object
    const url = `/report/${reportname}/suggestions?${new URLSearchParams(
      formData
    ).toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    //check if the data contains an array of suggestions
    if (Array.isArray(data.suggestions)) {
      //generate HTML for suggestions and display them
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

//function to select a suggestion for a parameter
function selectSuggestion(param, suggestion) {
  document.getElementById(param).value = suggestion;
  document.getElementById(`${param}-results`).innerHTML = "";
}
