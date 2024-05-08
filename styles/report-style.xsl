<!-- Template just for testing!-->

<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:fo="http://www.w3.org/1999/XSL/Format">

  <!-- Define the output as XSL-FO -->
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>

  <!-- Root template: Start of XSL-FO document -->
  <xsl:template match="/">
    <fo:root>
      <fo:layout-master-set>
        <!-- Define a simple page master -->
        <fo:simple-page-master master-name="simple-page" page-width="8.5in" page-height="11in">
          <fo:region-body margin="1in"/>
        </fo:simple-page-master>
      </fo:layout-master-set>
      <fo:page-sequence master-reference="simple-page">
        <fo:flow flow-name="xsl-region-body">
          <!-- Content goes here -->
          <!-- Apply templates to process the root element dynamically -->
          <xsl:apply-templates/>
        </fo:flow>
      </fo:page-sequence>
    </fo:root>
  </xsl:template>

  <!-- Template to process the root element dynamically -->
  <xsl:template match="/*">
    <!-- Create a block for the root element -->
    <fo:block>
      <!-- Apply templates to process its children -->
      <xsl:apply-templates/>
    </fo:block>
  </xsl:template>

  <!-- Template to process each element -->
  <xsl:template match="*">
    <!-- Output the element name -->
    <xsl:value-of select="concat(name(), ': ')"/>
    <!-- Output the text content -->
    <xsl:value-of select="."/>
    <!-- Add a line break -->
    <fo:block/>
  </xsl:template>

</xsl:stylesheet>
