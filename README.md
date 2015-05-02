# LIO
A lightweight image optimizer

This is a repository for the online app located at http://mrme.me/compressor or the Chrome app located at https://chrome.google.com/webstore/detail/batch-image-compressor/nnjcdebdgmmobaigncamnoaoepkbgkfh?utm_source=chrome-app-launcher-info-dialog

# Features
- Batch compress files
- runs offline
- fast (the processing is done client-side)

# Upcoming Features
(you can prod me to implement one of these first)
- Downsize and sharpen images (I want to use a better downsizing algorithm which will require me to redo the way pictures are displayed)
- Allow users to create custom filters (the infrastructure exists for this to be a heavy duty app, but I would rather offer additional features through plugins and keep the main app leightweight)
- Make it possible to individually edit images in addition to batch edits
- Add undo button
- Animate the UI
- Asynchrously compress pictures

# extending the app
If you have a website that allows users to upload pictures to the server, the ability to compress pictures before uploading, instead of afterwards, can greatly speed things up and improve the user experience. Bug me about this, and I will create documentation on how you can go about integrating the libraries into your website.
