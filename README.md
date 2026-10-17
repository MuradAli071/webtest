# SUPERX Technology

SUPERX Technology's editable company website, built with a React/Vite frontend,
an Express/Mongoose API, and a protected content-management panel.

## Requirements

- Node.js 20.19 or newer
- MongoDB, local or hosted

## Setup

1. Install dependencies from the project root:

   ```sh
   npm install
   ```

2. Copy `server/.env.example` to `server/.env` and configure:
   - `MONGODB_URI` for the MongoDB database.
   - `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` for the single administrator.
   - `JWT_SECRET` as a random secret of at least 32 characters.
   - `SITE_URL` as the public website origin (for example, `https://www.example.com`) for canonical sitemap, robots, and server-rendered page metadata URLs. It is required in production and optional for local development.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`
     for logo, favicon, homepage, service, portfolio, and About page image uploads.
     These are intentionally blank in the example file: obtain them from your
     Cloudinary account dashboard, add them only to `server/.env`, and restart
     the backend. Image upload controls explain this setup when storage is not configured.

   Generate a suitable JWT secret with:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

3. Start the API and frontend in separate terminals:

   ```sh
   npm run dev:server
   npm run dev:client
   ```

The Vite development server proxies `/api`, `/robots.txt`, and `/sitemap.xml`
requests to the API on port 5000.
The API waits for MongoDB to connect before it starts listening.
The initial six service records are inserted once into an empty service collection.
Edit them from `/admin`; only published services appear at `/services` and on the homepage.
The admin uses an HTTP-only, same-site session cookie. Use HTTPS in production.
The administrator sign-in page and dashboard are available at `http://localhost:5173/admin`.
The dashboard summary is served by the protected `GET /api/admin/dashboard` endpoint.
Manage portfolio stories at `/admin/projects`; published projects are available at
`/work` and `/work/:slug`. Uploaded project images are stored in the
`superx/portfolio` Cloudinary folder; MongoDB stores project metadata and image
references. Uploads are limited to 10 MB each and 12 gallery images per project.
Client names and outcomes are optional; publish only content approved for public use.
Manage company information at `/admin/about`; the public About page is `/about`.
Its introduction, mission and vision, working process, optional team and verified
achievements, and contact call to action are stored in MongoDB. The initial
introduction, mission, vision, process, and contact call to action are editable
starter copy; replace them with your approved company details. Team and
achievement sections start hidden and empty so no people or company claims are
invented. About images are stored in the `superx/about` Cloudinary folder.

Website settings, uploaded logo and favicon, homepage copy and hero image,
homepage section visibility, navigation, published FAQs/testimonials, contact
details including WhatsApp, social links, legal text, and global SEO metadata
are managed at `/admin/content`. Site, service, portfolio, and About image
uploads accept JPEG, PNG, WebP, AVIF, or GIF files up to 10 MB. Image uploads
require the Cloudinary environment settings above; uploaded images use
automatic format and quality optimization, and upload and cleanup errors are
shown in the admin panel. Public website content is available at `GET /api/site`;
editable starter homepage and SEO copy is prefilled in the Admin Panel. Contact
details remain blank until real company information is entered. Editable general
FAQs are provided as starter copy. The testimonial area includes an unpublished
draft reminder, and legal documents and portfolio stories remain empty until
approved content is provided. Starter About and site content are inserted once
into existing installations without replacing configured company content.
Legal text is served at
`GET /api/site/legal/privacy-policy` and `/api/site/legal/terms`. Contact and
project enquiries are submitted with `POST /api/enquiries`, are rate-limited, and
are never included in public responses. Authenticated administrators can review
and paginate them at `GET /api/admin/enquiries?page=1&limit=20` and update their
status with `PATCH /api/admin/enquiries/:id`. Administrator site settings use
`GET` and `PUT /api/admin/site`; all admin endpoints require the HTTP-only session.
The public project-enquiry page is `/contact`; it reads email, phone, WhatsApp,
social links and address from the settings managed at `/admin/content`. Enquiries
are saved to MongoDB whether or not email notifications are configured. To
enable optional SMTP notifications, set `SMTP_HOST`, `SMTP_PORT`,
`SMTP_FROM_EMAIL`, and `ENQUIRY_NOTIFICATION_EMAIL` in `server/.env`. For
authenticated SMTP providers, also set both `SMTP_USER` and `SMTP_PASSWORD`;
`SMTP_SECURE=true` enables TLS (port 465 is treated as secure automatically).
Leave all SMTP fields blank to keep the enquiry form working without email
notifications. A notification failure is reported separately; it does not undo
the saved enquiry.
The same content settings manage unique titles and meta descriptions for the
homepage, About, Contact, Services, Work, Privacy Policy, and Terms pages. The
configured social-sharing image is used for Open Graph and Twitter cards; service
and project detail pages derive titles and descriptions from their published
content. Public content uses short shared-cache lifetimes while browsers
revalidate, allowing timely visibility of admin edits.
`/robots.txt` excludes administrator pages and advertises `/sitemap.xml`; the
sitemap includes configured public pages and published service/project slugs.
Published services and projects are served from `/api/services` and
`/api/projects`; published About sections are served from `/api/about`. Service,
project, and About administration is available under `/api/admin/services`,
`/api/admin/projects`, and `/api/admin/about`. Administrator credentials and the
session-signing key remain environment configuration and are never returned by
the content APIs.

For production, run `npm run build` and deploy `client/dist` alongside the
server workspace. Express serves the built assets with long-lived immutable
caching and injects editable page-specific SEO and Open Graph metadata into the
HTML response, including detail-page metadata and proper HTTP 404 responses.
Point the public website origin and its routes to the Express server, and set
`SITE_URL` to that public origin. This also serves `/robots.txt` and the
published-content `/sitemap.xml` from the same host.

## Validation

```sh
npm run build
```

## Structure

- `client/` — Vite, React Router, Tailwind CSS, public content pages, and `/admin`
- `server/` — Express API, Mongoose content models, Cloudinary image storage, and protected admin routes
