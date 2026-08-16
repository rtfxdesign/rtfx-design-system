The brand's card/container: 1px border via nested shell (clip-path can't take borders), chamfered TL+BR. `inline="static"` marks the featured panel with the amber inner contour.

```jsx
<Panel>Default panel</Panel>
<Panel inline="static" padding="var(--s-6)">Featured</Panel>
<Panel small inline="hover">Hover reveals inline</Panel>
```
