# Report Generator

## Overview

Report Generator is a comprehensive solution for generating and handling various types of reports, including JSON, CSV, and PDF formats. The project leverages MSSQL and MySQL databases, providing a robust backend with customizable report parameters and suggestions. The API is documented using Swagger for easy integration and testing.

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/juergenrose/report-generator.git
   cd reporter-generator
   ```

2. Install the dependencies:
   ```sh
   npm install
   ```

## Usage

1. Start the server:

   ```sh
   npm start
   ```

2. The API will be available at `http://localhost:3000`.

## API Documentation

The API documentation is available through Swagger UI:

1. Open your browser and navigate to `http://localhost:3000/api-docs`.

2. You will see the Swagger UI where you can explore and test the API endpoints.

## Project Structure

The project structure is as follows:

```
dynamic-db-reporter/
│
├── config/
│   ├── mssql_db.js            # MSSQL database configuration and connection manager
│   └── mysql_db.js            # MySQL database configuration and connection manager
│
├── csv/                       # Directory for CSV files
│
├── json/                      # Directory for JSON files
│
├── meta/
│   ├── mssqlMeta.js           # MSSQL metadata handling
│   └── mysqlMeta.js           # MySQL metadata handling
│
├── node_modules/              # Directory for Node.js modules
│
├── pdf/                       # Directory for PDF files
│
├── public/
│   ├── css/
│   │   └── styles.css         # CSS styles
│   ├── img/
│   │   └── barcode.png        # Barcode image
│   ├── js/
│   │   ├── app.js             # Main application file
│   │   ├── converting.js      # Converting report files
│   │   ├── report.js          # Report handling
│   │   ├── scanner.js         # Scanner handling
│   │   ├── suggestions.js     # Suggestions handling
│   │   └── utils.js           # Utility functions
│
├── routes/
│   └── your_report_files/  # Predefined report queries and parameters
│
├── views/
│   ├── index.html             # Start page
│   └── report.html            # Report page
│
├── .env                       # Environment variables configuration
├── .gitignore                 # Git ignore file
├── convert-report.js          # Handlers for converting reports to JSON, CSV, and PDF
├── countryFlags.xml           # XML file for country flags
├── generate-api.js            # Swagger documentation generation
├── index.js                   # Main entry point
├── LICENSE                    # License file
├── logo.png                   # Project logo
├── package-lock.json          # NPM package lock file
├── package.json               # NPM package configuration
├── README.md                  # Project README
└── swagger.yaml               # Swagger documentation

```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -m 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

If you have any questions or need further assistance, please feel free to contact us at [juergenrose@gmail.com].

Enjoy using the Reporter API! Happy reporting!

```

This README file provides a comprehensive guide for setting up and using your Reporter API project, including installation instructions, configuration details, and a project structure overview.
```
