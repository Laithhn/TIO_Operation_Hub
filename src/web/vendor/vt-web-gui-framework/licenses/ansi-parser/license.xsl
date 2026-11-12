<?xml version="1.0" encoding="ISO-8859-1"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="external_package">
        <html>
            <body>
                <h1>License Info</h1>
                <h2>for <xsl:value-of select="vi_package_name"/> by <xsl:value-of select="vi_developer_name"/></h2>
                External license used for this package:<br/><br/>
                <table border="0">
                    <tr>
                        <td><i>Package</i></td>
                        <td><xsl:value-of select="manufacturer_package"/></td>
                    </tr>
                    <tr>
                        <td><i>Version</i></td>
                        <td><xsl:value-of select="version"/></td>
                    </tr>
                    <tr>
                        <td><i>Package description</i></td>
                        <td><xsl:value-of select="description"/></td>
                    </tr>
                    <tr>
                        <td><i>Manufacturer</i></td>
                        <td><xsl:value-of select="manufacturer"/></td>
                    </tr>
                    <tr>
                        <td><i>Manufacturer URL</i></td>
                        <td><xsl:value-of select="manufacturer_url"/></td>
                    </tr>
                    <tr>
                        <td><i>Download Date</i></td>
                        <td><xsl:value-of select="download_date"/></td>
                    </tr>
                    <tr>
                        <td><i>Download Page URL</i></td>
                        <td><xsl:value-of select="download_url"/></td>
                    </tr>
                    <tr>
                        <td><i>Download Page Imprint</i></td>
                        <td><xsl:value-of select="download_imprint"/></td>
                    </tr>
                    <tr>
                        <td><i>License Info URL</i></td>
                        <td><xsl:value-of select="license_url"/></td>
                    </tr>
                    <tr>
                        <td><i>License Model</i></td>
                        <td><xsl:value-of select="license_model"/></td>
                    </tr>
                    <tr>
                        <td><i>License File</i></td>
                        <td><xsl:value-of select="license_text"/></td>
                    </tr>
                    <tr>
                        <td><i>Alternative Licenses</i></td>
                        <td><xsl:value-of select="alternative_licenses"/></td>
                    </tr>
                </table>
            </body>
        </html>
    </xsl:template>

</xsl:stylesheet>