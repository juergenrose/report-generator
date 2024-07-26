<!-- @format -->

# Report Generator Web Application

**Still under development!**

This web application generates and downloads reports in JSON, CSV, and PDF formats and includes a barcode scanning feature.

## Features

- **Report Generation**: Fetch, display, and generate reports with dynamic parameter input fields.
- **Barcode Scanning**: Scan barcodes to fetch related report data.
- **Download Reports**: Save reports in JSON, CSV, or PDF formats.
- **API Documentation**: Auto-generated Swagger API docs.

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
   node index.js
   ```

## Usage

1. Navigate to `http://localhost:3000`.
2. Select a report, enter parameters, and generate the report.
3. Download the report or scan a barcode for related data.

## Frontend

- **HTML**: Layout (`index.html`)
- **CSS**: Styles (`/css/styles.css`)
- **JavaScript**:
  - **`app.js`**: Fetch reports, display parameters, generate report data.
  - **`scanner.js`**: Barcode scanning and handling.
  - **`converting.js`**: Convert JSON to CSV and generate PDF content.
  - **`suggestions.js`**: Fetch suggestions based on query

## Backend

- **Express Server** (`index.js`): Setup, routes, middleware.
- **Report Handlers** (`convert-report.js`): JSON, CSV, PDF generation.
- **API Docs** (`generate-api.js`): Swagger documentation setup.

### Routes

- `GET /report`: List available reports.
- `GET /report/:reportname`: Fetch and generate report data.
- `GET /report/:reportname/suggestions`: Fetch suggestions based on query.

## API Documentation

Available at `http://localhost:3000/api-docs`.

## License

Licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
