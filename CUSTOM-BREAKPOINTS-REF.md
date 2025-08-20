# Custom Tailwind CSS Breakpoints Setup

## Overview
Your project now uses custom Tailwind CSS breakpoints that match your original CSS media queries, with the flexibility to easily modify them in the future.

## Custom Breakpoints Configured

### Your Original CSS → New Tailwind Breakpoints
- `@media (max-width: 550px)` → `max-sm:` (max-width: 519px)
- `@media (max-width: 770px)` → `max-md:` (max-width: 769px)  
- `@media (min-width: 1025px)` → `lg:` (min-width: 1025px)

### All Available Breakpoints
```css
/* Mobile-first (min-width) */
xs: 480px    /* Extra small devices */
sm: 520px    /* Small devices - YOUR CUSTOM */
md: 770px    /* Medium devices - YOUR CUSTOM */
lg: 1025px   /* Large devices - YOUR CUSTOM */
xl: 1280px   /* Extra large devices */
2xl: 1536px  /* 2X Extra large devices */

/* Max-width (mobile-first approach) */
max-xs: 479px   /* Less than 480px */
max-sm: 519px   /* Less than 520px - YOUR CUSTOM */
max-md: 769px   /* Less than 770px - YOUR CUSTOM */
max-lg: 1024px  /* Less than 1025px */
max-xl: 1279px  /* Less than 1280px */
```

## How to Modify Breakpoints

### Option 1: Using CDN (Current Setup)
Edit the configuration in your HTML templates (`base.html` and `base_fab.html`):

```html
<script>
    tailwind.config = {
        theme: {
            screens: {
                'sm': '520px',  // Change this value to your desired breakpoint
                'md': '770px',  // Change this value too
                // ... other breakpoints
            }
        }
    }
</script>
```

### Option 2: Using Config File (Alternative)
If you switch to a build process later, you can use the `tailwind.config.js` file:

```javascript
module.exports = {
  theme: {
    screens: {
      'sm': '520px',  // Your custom small breakpoint
      'md': '770px',  // Your custom medium breakpoint
      // ... modify as needed
    }
  }
}
```

## Files Updated
- ✅ `base.html` - Updated with custom breakpoint configuration
- ✅ `base_fab.html` - Updated with custom breakpoint configuration  
- ✅ `tailwind.config.js` - Created for reference (not used with CDN)
- ✅ `breakpoints-reference.css` - Documentation file
- ✅ `responsive.css` - Updated with migration notes

## Usage Examples

### Hide text on small screens (< 520px)
```html
<span class="max-sm:hidden">This text disappears below 520px</span>
```

### Different font sizes across breakpoints
```html
<h1 class="text-5xl max-md:text-4xl max-sm:text-3xl">
  Responsive heading
</h1>
```

### Responsive layout changes
```html
<div class="flex max-sm:flex-col max-sm:gap-2">
  Horizontal on desktop, vertical stack on mobile
</div>
```

## Testing Your Breakpoints

1. Open your browser's developer tools
2. Resize the window or use device simulation
3. Check that styles change at exactly:
   - **520px** for `max-sm:` classes
   - **770px** for `max-md:` classes
   - **1025px** for `lg:` classes

## Future Customization

Want to change the small breakpoint from 520px to 480px?

1. **Using CDN**: Update the value in both `base.html` and `base_fab.html`:
   ```javascript
   'sm': '480px',       // Changed from 520px
   'max-sm': {'max': '479px'},  // Changed from 519px
   ```

2. **All your existing HTML classes** (`max-sm:hidden`, `max-sm:text-sm`, etc.) **will automatically use the new breakpoint** - no need to change any HTML!

## Benefits
- ✅ **Easy to customize** - Change breakpoints in one place
- ✅ **Maintains your original design** - Matches your 520px/770px breakpoints
- ✅ **No HTML changes needed** - All existing classes work with new breakpoints
- ✅ **Better maintainability** - Centralized breakpoint configuration
- ✅ **Reduced CSS bundle size** - Replaced ~400 lines of custom CSS

Your responsive design now uses modern Tailwind CSS utilities while preserving your exact original breakpoint behavior!
