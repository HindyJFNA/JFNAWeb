document.addEventListener("DOMContentLoaded", function () {
      const videos = document.querySelectorAll('.video-list .vid');
      const loadMoreBtn = document.querySelector('.load-more');
      let currentIndex = 0;
      const videosPerClick = 6;

      function showVideos() {
        for (let i = currentIndex; i < currentIndex + videosPerClick; i++) {
          if (videos[i]) {
            videos[i].classList.add('visible');
          }
        }
        currentIndex += videosPerClick;

        if (currentIndex >= videos.length) {
          loadMoreBtn.textContent = "No more videos";
          loadMoreBtn.disabled = true;
        }
      }

      loadMoreBtn.addEventListener('click', showVideos);
    });
