document.querySelectorAll('.entry').forEach(entry => {

  const link = entry.querySelector('h3 a'); // Adjust selector as needed
  
  const a = document.createElement('a');
  
  const p = document.createElement('p');
  link.parentNode.insertBefore(p, link); // insert <p> before <a>
  p.appendChild(a); // move <a> inside <p>
  
  
  a.href = link.href; // Set your desired URL
  a.textContent = 'Apply now';
  p.classList.add('arrow-btn'); // Optional class for styling

  entry.appendChild(p); // Add it at the end of each .entry
});