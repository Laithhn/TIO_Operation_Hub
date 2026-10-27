In Anlehnung an https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs werden folgende Icons verwendet:

favicon.ico
-----------

A favicon.ico for legacy browsers.
ICO files actually have a directory structure and can pack files with different resolutions. I recommend sticking to a single 32×32 image, unless the one you have doesn’t downscale well to 16×16 (if it becomes blurry, for instance). In that case, you can ask your designer to come up with a special version of the logo that’s tailored to fit small pixel grids.
Don’t get smart with the folder static asset folder structure and cache busters. https://example.com website should have a favicon on https://example.com/favicon.ico. Some tools, like RSS readers, just request /favicon.ico from the server and don’t bother looking elsewhere. We need sizes="32x32" for <link> to .ico file in order to fix the Chrome bug where it chooses an ICO file over an SVG.

icon.svg
--------

A single SVG icon with a light/dark version for modern browsers.
SVG is a vector format that describes curves instead of pixels. At large sizes, it’s more efficient than raster images. As of this writing, 72% of all browsers support SVG icons. Your HTML page should have a <link> tag in its <head> with rel="icon", type="image/svg+xml" and with the href containing a link to the SVG file as attributes. SVG is an XML format and can contain a <style> tag to describes CSS. As with any CSS, it can contain media queries like @media (prefers-color-scheme: dark). This will allow you to toggle the same icon between light and dark system themes.

apple-touch-icon.png
--------------------

180×180 PNG image for Apple devices.
The Apple touch icon is an image that Apple devices will use if you add the webpage as a shortcut to your home screen on an iPhone or iPad. Your HTML page should have <link rel="apple-touch-icon" href="apple-touch-icon.png"> tag inside <head>.
Since iOS 8+, iPads have required an image with a 180×180 resolution. Other devices will downscale it, but if we provide the source with a high-enough quality, the downscaling won’t hurt the end-user. An Apple touch icon will look better if you place 20px padding around the icon and add some background color.

Note that the icon is disabled at the moment, because Firefox uses it as bookmark icon instead of the svg icon.

icon-192.png
icon-512.png
------------

Web app manifest with 192×192 and 512×512 PNG icons for Android devices.
A web app manifest is a JSON file containing all the details for a browser to install your website as a system application. This format came about from Google via its PWA initiative. Your HTML page should have a <link rel="manifest" href="path.webmanifest"> tag with a link to the manifest file. The manifest should have an icon field that links to two icons: 192×192, for display on the home screen, and 512×512 which will be used as a splash screen as PWA is loading.