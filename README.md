# Ralph Lauren Sitemap Monitor

This repository contains a simple script and GitHub Actions workflow to
monitor the sitemaps provided by [Ralph Lauren](https://www.ralphlauren.com/)
for newly added pages. The main goal is to capture **new** URLs—those
that have not been seen before—and ignore URLs that have simply been
updated.

## How it works

* The sitemap index file (available at `https://www.ralphlauren.com/index`) lists a handful of sub‑sitemaps, such as
  `contentsitemap_0`, `productsitemap_0`, `categorysitemap`, etc. Each
  sub‑sitemap is identified by its `<loc>` element inside the index
  document【336331664324739†L68-L87】.

* Each sub‑sitemap contains a series of `<url>` entries. Every entry
  contains a `<loc>` for the page, a `<lastmod>` timestamp, and
  metadata like `<changefreq>` and `<priority>`【340252636354267†L68-L72】.

* The `fetch_new_urls.py` script fetches all of the known sitemaps,
  extracts every URL, and compares them against an `all_urls.txt`
  archive. Any new URLs (i.e., URLs not already present in the
  archive) are written to a file named `new_urls_YYYY-MM-DD.txt`. The
  script then updates the archive to include all current URLs.

* A GitHub Actions workflow (`.github/workflows/sitemap.yml`) runs the
  script every day at 02:00 UTC. If there are any new URLs or the
  archive changes, the workflow commits the updated files back to the
  repository.

## Files in this repository

* `fetch_new_urls.py` – Python script that downloads the sitemap index
  and sub‑sitemaps, identifies new URLs, and maintains an archive.

* `.github/workflows/sitemap.yml` – GitHub Actions workflow that
  installs dependencies, runs the script on a schedule, and commits
  changes.

* `all_urls.txt` – Archive of URLs that have been seen so far. This
  file is created automatically on the first run.

* `new_urls_YYYY-MM-DD.txt` – Files generated on runs when new URLs
  are found. Each file contains only the URLs discovered on that date.

## Running locally (optional)

Although this repository is designed to run in GitHub Actions, you can
test it locally by installing `requests` and executing the script:

You can test it locally by installing `requests` and running:

    pip install requests
    python fetch_new_urls.py

The script will print a summary of its actions and create/update the
appropriate text files in the working directory.
