# Report Generator Web Application
# Still under development!
This repository contains a web application for generating and downloading various reports based on available data. It supports multiple formats such as JSON, CSV, and PDF, and includes a barcode scanning feature.

## Features

- **Report Generation**: Fetch and display available reports, dynamically generate parameter input fields, and display report data in various formats.
- **Barcode Scanning**: Scan barcodes to fetch and display report data related to the scanned barcode.
- **Download Reports**: Download reports in JSON, CSV, or PDF formats.
- **API Documentation**: Automatically generated Swagger API documentation.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Frontend](#frontend)
- [Backend](#backend)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/your-username/report-generator.git
    cd report-generator
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Run the server:
    ```bash
    npm start
    ```

The server will start at `http://localhost:3000`.

## Usage

1. Open your browser and navigate to `http://localhost:3000`.
2. Select a report from the dropdown menu to view and enter the required parameters.
3. Generate the report to view it in JSON format, CSV table, or PDF preview.
4. Use the download feature to save the report in the desired format.
5. Scan a barcode to fetch and display related report data.

## Frontend

### Structure

- **HTML**: Main layout and structure (`index.html`).
- **CSS**: Styles for the application (`/css/styles.css`).
- **JavaScript**: 
  - **`app.js`**: Handles fetching reports, displaying parameters, and generating report data.
  - **`scanner.js`**: Manages barcode scanning and handling barcode data.
  - **`converting.js`**: Functions for converting JSON to CSV and generating PDF content.

### Main Functions

- `fetchReports()`: Fetches and populates available reports.
- `fetchParams()`: Fetches and displays parameters for the selected report.
- `showJsonOutput(event)`: Handles form submission to display report data.
- `downloadReport(event)`: Downloads the report in the selected format.
- `startScanning()`: Starts the barcode scanner.
- `handleManualBarcodeCheck()`: Checks if the manually entered barcode exists in the database.

## Backend

### Structure

- **Express Server** (`index.js`): Main server setup, route handling, and middleware configuration.
- **Report Handlers** (`convert-report.js`): Functions to handle JSON, CSV, and PDF report generation.
- **API Documentation** (`generate-api.js`): Generates Swagger API documentation.

### Main Functions

- `handleJsonReport()`: Handles JSON report generation and download.
- `handleCsvReport()`: Handles CSV report generation.
- `generatePdfContent()`: Generates PDF report content.
- `setupSwagger()`: Sets up Swagger UI for API documentation.

### Routes

- `GET /report`: Fetches the list of available reports.
- `GET /report/:reportname`: Fetches report data and generates reports in various formats.
- `GET /report/:reportname/suggestions`: Fetches suggestions for the specified report based on query parameters.

## API Documentation

API documentation is generated using Swagger and is available at `http://localhost:3000/api-docs`.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch.
    ```bash
    git checkout -b feature/your-feature
    ```
3. Make your changes.
4. Commit your changes.
    ```bash
    git commit -m 'Add some feature'
    ```
5. Push to the branch.
    ```bash
    git push origin feature/your-feature
    ```
6. Open a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

