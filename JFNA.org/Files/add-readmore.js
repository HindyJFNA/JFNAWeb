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