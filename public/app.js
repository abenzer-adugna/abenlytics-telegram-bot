document.addEventListener('DOMContentLoaded', () => {
  // 1-to-1 Help
  const helpBtn = document.getElementById('helpBtn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      alert("✅ 1-to-1 Help service is coming soon!");
      // You can replace this with content load or API call
    });
  }

  // Essential Investing Books
  const booksBtn = document.getElementById('booksBtn');
  if (booksBtn) {
    booksBtn.addEventListener('click', () => {
      alert("📚 Displaying essential investing books...");
      // Future: fetch('/api/books') and load into a content area
    });
  }

  // Book Reviews & Insights
  const reviewsBtn = document.getElementById('reviewsBtn');
  if (reviewsBtn) {
    reviewsBtn.addEventListener('click', () => {
      alert("📝 Book reviews and insights coming soon!");
    });
  }

  // Weekly Investing Newsletter
  const newsletterBtn = document.getElementById('newsletterBtn');
  if (newsletterBtn) {
    newsletterBtn.addEventListener('click', () => {
      alert("📰 Weekly newsletter feature is in progress!");
    });
  }

  // Roadmaps
  const roadmapBtn = document.getElementById('roadmapBtn');
  if (roadmapBtn) {
    roadmapBtn.addEventListener('click', () => {
      alert("🗺️ Roadmaps for trading and investing coming soon!");
    });
  }

  // Prospectus Review
  const prospectusBtn = document.getElementById('prospectusBtn');
  if (prospectusBtn) {
    prospectusBtn.addEventListener('click', () => {
      alert("📄 Prospectus review feature launching soon!");
    });
  }

  // Abenlytics Club Group
  const groupBtn = document.getElementById('groupBtn');
  if (groupBtn) {
    groupBtn.addEventListener('click', () => {
      alert("👥 Join the Abenlytics Club group!");
      // Future: redirect or load group invite
    });
  }
});
