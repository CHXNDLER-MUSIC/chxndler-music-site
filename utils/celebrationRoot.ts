/**
 * Top-layer portal root for purchase celebrations (card / merch / element card).
 *
 * The HeartCoin display sits at the max z-index (2147483647), so a celebration can
 * only paint above it by using that same z-index AND coming later in the DOM.
 * Call this right before showing a celebration: it creates the root on first use
 * and moves it to the end of <body> so it wins the tie against anything opened since.
 */
export function getCelebrationRoot(): HTMLElement {
  const id = 'purchase-celebration-root';
  let root = document.getElementById(id);
  if (!root) {
    root = document.createElement('div');
    root.id = id;
    root.style.position = 'relative';
    root.style.zIndex = '2147483647';
  }
  if (root !== document.body.lastElementChild) document.body.appendChild(root);
  return root;
}
