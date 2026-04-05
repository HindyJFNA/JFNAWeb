function moveElements() {
  document.querySelectorAll('.entry').forEach(entry => {
    const col5 = entry.querySelector('.col-5, .col-6-mobile');
    const h2 = col5?.querySelector('h2');
    const col2 = entry.querySelector('.col-2');
    const tags = entry.querySelector('.col-2 ul.tags');

    if (col5 && h2 && col2 && !col5.contains(col2)) {
      col5.insertBefore(col2, h2.nextSibling);
    }

    if (col5 && h2 && tags && tags.parentElement !== col5) {
      col5.insertBefore(tags, h2);
    }
  });
}

document.addEventListener('DOMContentLoaded', moveElements);
window.addEventListener('resize', moveElements);

document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.entry').forEach(entry => {

    const link = entry.querySelector('h2 a'); // Adjust selector as needed
    
    const a = document.createElement('a');

    const section = entry.querySelector('.col-5'); 
    
    const p = document.createElement('p');
    link.parentNode.insertBefore(p, link); // insert <p> before <a>
    p.appendChild(a); // move <a> inside <p>
    
    
    a.href = link.href; // Set your desired URL
    a.textContent = 'Read more';
    p.classList.add('arrow-btn'); // Optional class for styling

    section.appendChild(p); // Add it at the end of each .entry
  });
});
