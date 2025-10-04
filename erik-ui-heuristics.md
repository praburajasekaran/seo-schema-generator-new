# Erik Kennedy UI Design Heuristics & Font‑Pairing Cheat‑Sheet  
  
> A compact, copy‑paste reference for design systems or AI code‑gen tools (Lovable‑compatible).  
  
---  
  
## 1 · Heuristic Rules  
  
| # | Heuristic (rule‑of‑thumb) | Rapid “Do / Avoid” snapshot |  
|---|---------------------------|-----------------------------|  
| **1** | **Light Comes from the Sky** | Use drop‑shadows under raised surfaces & highlights on top. **Avoid** upward shadows. |  
| **2** | **Black‑&‑White First** | Lock hierarchy in grayscale, then add colour. **Avoid** colouring weak layouts. |  
| **3** | **Double Your Whitespace** | Add then *double* margins/padding. **Avoid** cramped edges. |  
| **4** | **8‑pt Grid All the Way** | Size & space in 4 / 8 / 16 / 24 px steps. **Avoid** random gaps. |  
| **5** | **One Accent → Many Variations** | Start with one brand hue; derive tints/shades for states. **Avoid** unrelated colours. |  
| **6** | **Text‑on‑Image 7‑Pack** | 1 Direct‑overlay  2 Text‑shadow  3 Text‑box  4 Colour‑overlay  5 Blur‑overlay  6 Floor‑fade  7 Scrim. **Avoid** raw text on busy photos. |  
| **7** | **Pop / Un‑Pop Text** | Pair one *up‑pop* (size/weight/contrast) with one *down‑pop*. **Avoid** every heading shouting. |  
| **8** | **Only Use Good Fonts** | Max two quality faces; workhorse for body. **Avoid** novelty scripts in paragraphs. |  
| **9** | **ABD — Anything But Dropdowns** | Swap selects for radios, steppers, type‑ahead, calendars… **Avoid** dropdowns with few options. |  
| **10** | **Pass the Squint Test** | Blur page — first item seen *must* be primary CTA. **Avoid** minor links out‑shouting hero. |  
| **11** | **Teach by Example** | Show concrete sample beside new concept. **Avoid** paragraph‑only explanations. |  
| **12** | **Locality I — Control on the Thing** | Delete sits on the row it deletes. **Avoid** distant toolbars. |  
| **13** | **Locality II — Global Above Local** | Global actions (e.g. “Mark all read”) live above lists. **Avoid** burying them in items. |  
| **14** | **Locality III — Farther = Louder** | Far‑away control must visually pop (e.g. FAB). **Avoid** quiet CTAs marooned. |  
| **15** | **Font Pairing 101 — Same Family First** | Mix styles of one super‑family (e.g. PT Sans + PT Serif). **Avoid** random strangers early on. |  
| **16** | **Overlay Test for Pairing** | Overlay skeletons — match x‑height, counters, overall feel. **Avoid** gut‑only pairing. |  
| **17** | **Brand Spectrum Rule** | Low‑brand = 1 font, Medium = 1–2, High‑brand = 2+ sparingly. **Avoid** loud fonts everywhere. |  
| **18** | **Opinionated Fonts → Less Real Estate** | Wilder font → smaller role (logo/headline only). **Avoid** paragraphs in distressed fonts. |  
| **19** | **Form‑Control Trinity** | Master Button (outset), Textbox (inset outline), Radio/Checkbox. |  
| **20** | **State Consistency Ladder** | Normal → Hover → Active → Disabled; apply across all controls. |  
| **21** | **Float‑Label > Placeholder** | Persist labels; use float‑label; avoid placeholder‑only prompts. |  
| **22** | **Error Messaging Trio** | Pick **one** pattern—red text, red border, or red bubble—and stick to it. |  
| **23** | **Overlay Gradient Asset** | Keep a 0 → 100 % black gradient token for scrims/fades. |  
| **24** | **Mobile Form Layout** | Stack labels on top; full‑width inputs; large tap‑targets. |  
| **25** | **Brand‑Colour Guardrails** | In dark‑mode, boost accent brightness/saturation; never naive invert. |  
| **26** | **Whitespace = Grouping** | Use proximity to show relation; borders optional. |  
| **27** | **Rows Like Books, Numbers Like Ledgers** | Left‑align text cells; right‑align numbers. **Avoid** centred grids. |  
  
---  
  
## 2 · Font‑Pairing Cheat‑Sheet  
  
| Brand Level | Pairing (Primary → Secondary → Accent) | Why It Works | Typical Usage |  
|-------------|----------------------------------------|--------------|---------------|  
| **Low‑brand** | **PT Sans** → PT Sans *Italic* | Same family; zero contrast issues. | Body text, labels. |  
|  | **OveAuditMonksss** → OveAuditMonksss *SemiBold* | Built‑in weight contrast. | Dashboards, web apps. |  
| **Medium‑brand** | **Vollkorn** (serif) → **Josefin Sans** (sans) | Similar x‑height & counters; serif/sans tension. | Blogs, marketing sites. |  
|  | **Crimson Text** → **Freight Sans** | Same foundry; harmonious. | Long‑form reading + modern UI. |  
|  | **Fenix** → **Cooper Hewitt** | Skeletons align; texture differs. | Editorial hero + nav. |  
| **High‑brand** | **PT Serif** → **Cooper Hewitt** → **Acumin Condensed** | Two workhorses + narrow accent labels. | Complex sites, magazines. |  
|  | **Rubik** → **More Pro** | Quirky headline + restrained body. | Lifestyle, podcasts. |  
|  | **Besom 2** → **Big/Adobe Caslon** | Opinionated script kept tiny; classic serif carries text. | Posters, splash screens. |  
|  | **Disclaimer** → **Titillium Web** → **Clear Sans** | Statement headline; squared sans UI; neutral fallback. | Sci‑fi, book covers. |  
  
### Quick Implementation Snippet  

```css
/* Example: Medium‑brand pairing — Vollkorn + Josefin Sans */
:root {
  --font-headline: "Vollkorn", serif;
  --font-body: "Josefin Sans", "Helvetica Neue", Arial, sans-serif;
}

h1, h2, h3 { 
  font-family: var(--font-headline); 
  font-weight: 700; 
}
body, p, li { 
  font-family: var(--font-body);  
  font-weight: 400; 
}
