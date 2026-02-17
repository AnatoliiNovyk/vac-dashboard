# Logo Replacement Instructions

## Current Status
A placeholder SVG logo has been added to the login form at `assets/logo.svg`.

## To Replace with Actual Logo

1. **Prepare your logo file:**
   - Recommended format: SVG (scalable) or PNG (high resolution)
   - Recommended dimensions: 200-400px wide, maintaining aspect ratio
   - File should be optimized for web (compressed)

2. **Replace the placeholder:**
   ```bash
   # If using SVG (recommended):
   cp /path/to/your/actual-logo.svg assets/logo.svg
   
   # If using PNG or other format:
   cp /path/to/your/actual-logo.png assets/logo.png
   # Then update index.html line 179 to reference the new file extension
   ```

3. **If using a different image format:**
   Update `index.html` line 179:
   ```html
   <!-- Change from: -->
   <img src="assets/logo.svg" alt="EGIS-UKRAINA Logo" class="welcome-logo">
   
   <!-- To (for PNG): -->
   <img src="assets/logo.png" alt="EGIS-UKRAINA Logo" class="welcome-logo">
   ```

4. **Adjust CSS if needed:**
   If your logo requires different dimensions, edit `style.css` line 832-840:
   ```css
   .welcome-logo {
     max-width: 200px;  /* Adjust this value */
     height: auto;
     margin-bottom: var(--space-24);
     display: block;
     margin-left: auto;
     margin-right: auto;
   }
   ```

5. **Test the changes:**
   - Run `firebase emulators:start` or serve the files locally
   - Navigate to the login page
   - Verify the logo displays correctly

## Current Placeholder
The current SVG logo shows "EGIS-UKRAINA" text in the brand colors:
- EGIS: Teal (#21808d)
- UKRAINA: Slate gray (#626c71)

This placeholder matches the existing color scheme and can be replaced without any code changes.
