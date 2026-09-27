// Screenshot galleries of the project cards, written by tools/galleries.html (safe to edit by hand: keep it valid JSON).
// Key = card id without "p-". colors = the two background colours (optional, else taken from the card colour).
window.GALLERIES = {
  "siem": {
    "colors": ["#fb7185", "#6d28d9"],
    "images": [
      {
        "src": "assets/img/projects/siem/01-overview.jpg",
        "w": 1600,
        "h": 1103,
        "alt": "Security dashboard: downloads and uploads by category, Sankey of downloaded file types",
        "caption": "Online activity overview: downloads and uploads by category, and which file types are downloaded (Sankey)."
      },
      {
        "src": "assets/img/projects/siem/02-timeline.jpg",
        "w": 1600,
        "h": 1036,
        "alt": "Security dashboard: 7-day timeline of download and upload volumes in three panels",
        "caption": "Timeline: a 3-step check to confirm unusual activity and rule out sync and redundant logs."
      },
      {
        "src": "assets/img/projects/siem/03-exfiltration.jpg",
        "w": 1600,
        "h": 1296,
        "alt": "Security dashboard: top SharePoint downloads and files copied to USB devices",
        "caption": "Exfiltration view: top SharePoint downloads and files copied to USB devices (sensitive fields blurred)."
      }
    ]
  },
  "boudoubox": {
    "colors": ["#38bdf8", "#0b3df5"],
    "images": [
      {
        "src": "assets/img/projects/boudoubox/01-home.jpg",
        "w": 1600,
        "h": 1440,
        "alt": "BoudouBox website home page",
        "caption": "Home page: local positioning in Agde, a clear call to action and the service commitments."
      },
      {
        "src": "assets/img/projects/boudoubox/02-offers.jpg",
        "w": 1600,
        "h": 1229,
        "alt": "BoudouBox website box sizes from 1.2 to 10 square metres",
        "caption": "Offers: box sizes from 1.2 to 10 m², each with an illustration of what fits inside."
      }
    ]
  }
};
