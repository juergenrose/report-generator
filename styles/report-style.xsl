<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:fo="http://www.w3.org/1999/XSL/Format"
  xmlns:date="http://exslt.org/dates-and-times">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:namespace-alias stylesheet-prefix="date" result-prefix="date" />
  <xsl:param name="Code"/>
  <xsl:param name="Permalink"/>

  <!-- Main template to generate the PDF -->
  <xsl:template match="/">
    <fo:root>
      <fo:layout-master-set>
        <fo:simple-page-master master-name="report-pdf" page-width="210mm" page-height="297mm">
          <fo:region-body margin="15mm"/>
        </fo:simple-page-master>
      </fo:layout-master-set>
      <fo:page-sequence master-reference="report-pdf">
        <fo:flow flow-name="xsl-region-body">
          <!-- Header block with report name, created date, and logo -->
          <fo:block space-after="5mm" border-bottom="1pt solid black" padding-bottom="10pt">
            <fo:table table-layout="fixed">
              <fo:table-column column-width="proportional-column-width(1)"/>
              <fo:table-column column-width="proportional-column-width(1)"/>
              <fo:table-column column-width="proportional-column-width(1)"/>
              <fo:table-body>
                <fo:table-row>
                  <fo:table-cell>
                    <fo:block font-size="10pt" font-weight="bold" text-align="left">
                      Report:
                      <xsl:value-of select="name(/*)"/>
                    </fo:block>
                  </fo:table-cell>
                  <fo:table-cell>
                    <fo:block font-size="10pt" font-weight="bold" text-align="center">
                      Created on:
                      <xsl:value-of select="date:date-time()"/>
                    </fo:block>
                  </fo:table-cell>
                  <fo:table-cell>
                    <fo:block text-align="right">
                      <fo:external-graphic src="logo.png" content-width="30mm"/>
                    </fo:block>
                  </fo:table-cell>
                </fo:table-row>
                <!-- Include row for permalink -->
                <fo:table-row>
                  <fo:table-cell number-columns-spanned="3">
                    <fo:block font-size="10pt" font-style="italic" text-align="center" margin-top="3mm">
                      <fo:basic-link external-destination="{$Permalink}">
                        <xsl:value-of select="$Permalink"/>
                      </fo:basic-link>
                    </fo:block>
                  </fo:table-cell>
                </fo:table-row>
              </fo:table-body>
            </fo:table>
          </fo:block>
          <!-- Table block for report data -->
          <fo:table>
            <fo:table-body>
              <xsl:apply-templates/>
            </fo:table-body>
          </fo:table>
        </fo:flow>
      </fo:page-sequence>
    </fo:root>
  </xsl:template>

  <xsl:template match="/*">
    <xsl:apply-templates/>
  </xsl:template>

  <!-- Template for each record element -->
  <xsl:template match="*[starts-with(name(), 'record_')]">
    <!-- Render the row with the flag and data -->

    <fo:table-row>
      <fo:table-cell>
        <!-- Block to display the flag image above the data -->
        <fo:block>
          <!-- Use the flag image URL passed as a parameter -->
          <xsl:variable name="flagUrl" select="document('countryFlags.xml')/flags/*[name()=$Code]"/>
          <!-- Display the image using the retrieved URL -->
          <fo:block text-align="end" space-after="10pt">
            <fo:external-graphic src="{$flagUrl}" content-width="15mm"/>
          </fo:block>
          <!-- Block to display the data below the flag image -->
          <fo:block>
            <xsl:apply-templates/>
          </fo:block>
        </fo:block>
      </fo:table-cell>
    </fo:table-row>
  </xsl:template>
  <!-- Template to match any other elements -->
  <xsl:template match="*">
    <fo:block margin="4mm" text-align="left">
      <fo:inline font-weight="bold" font-size="10pt">
        <xsl:value-of select="concat(name(), ': ')"/>
      </fo:inline>
      <fo:inline margin-top="2mm" font-size="10pt">
        <xsl:value-of select="."/>
      </fo:inline>
    </fo:block>
  </xsl:template>

</xsl:stylesheet>
