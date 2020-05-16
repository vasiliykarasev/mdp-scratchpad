function SetLineTransform(element, x1, x2, y1, y2) {
  const ux = x2 - x1;
  const uy = y2 - y1;
  const theta = Math.atan2(uy, ux);
  const length = Math.sqrt(ux * ux + uy * uy);
  s = '';
  s = s + `translate(${x2}px, ${y2}px) `;
  s = s + `rotate(${theta * 180.0 / Math.PI + 180.0}deg) `;
  s = s + `translate(${+ length / 2}px, ${+ length / 2}px)`;
  element.style.transform = s;
  element.style.width = `${length}px`;
}

function CreateLineElement() {
  let el = document.createElement('div');
  el.classList.add('line');
  el.style.backgroundColor = `rgb(0,0,0)`;
  el.style.width = `1px`;
  return el;
}
