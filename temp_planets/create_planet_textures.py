#!/usr/bin/env python3
import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
import os

def create_seamless_texture(image_path, output_path, planet_type):
    """
    Create a seamless planet texture with proper UV wrapping and effects
    """
    # Load the image
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        print(f"Error: Could not load {image_path}")
        return
    
    # Convert BGR to RGB for PIL
    if len(img.shape) == 3:
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    else:
        img_rgb = img
    
    # Convert to PIL Image
    pil_img = Image.fromarray(img_rgb)
    
    # Resize to 1024x1024 initially
    pil_img = pil_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    # Convert to RGBA if needed
    if pil_img.mode != 'RGBA':
        pil_img = pil_img.convert('RGBA')
    
    # Create seamless wrapping by blending edges
    width, height = pil_img.size
    overlap = 64  # Overlap region for seamless blending
    
    # Create a new image for seamless processing
    seamless = pil_img.copy()
    
    # Horizontal seamless wrapping
    left_edge = pil_img.crop((0, 0, overlap, height))
    right_edge = pil_img.crop((width - overlap, 0, width, height))
    
    # Blend the edges
    for x in range(overlap):
        alpha = x / overlap
        for y in range(height):
            left_pixel = left_edge.getpixel((x, y))
            right_pixel = right_edge.getpixel((overlap - 1 - x, y))
            
            # Blend pixels
            blended = tuple(int(left_pixel[i] * (1 - alpha) + right_pixel[i] * alpha) for i in range(4))
            seamless.putpixel((x, y), blended)
            seamless.putpixel((width - overlap + x, y), blended)
    
    # Add planet-specific effects
    enhanced = add_planet_effects(seamless, planet_type)
    
    # Add soft bloom glow
    glowing = add_soft_glow(enhanced)
    
    # Add subtle surface details
    textured = add_surface_details(glowing, planet_type)
    
    # Remove background (make space transparent/black)
    final = remove_background(textured)
    
    # Save the result
    final.save(output_path, 'PNG', optimize=True)
    print(f"Created {output_path}")

def add_planet_effects(img, planet_type):
    """Add planet-specific holographic effects"""
    img_array = np.array(img)
    
    if planet_type == 'heart':
        # Add warm pink/red holographic tint
        tint = np.array([1.2, 0.9, 1.1, 1.0])  # Enhance red/pink
        img_array = img_array * tint
        
    elif planet_type == 'lightning':
        # Add electric blue/purple tint with energy
        tint = np.array([0.8, 0.9, 1.3, 1.0])  # Enhance blue
        img_array = img_array * tint
        
    elif planet_type == 'water':
        # Add cyan/blue aquatic tint
        tint = np.array([0.7, 1.1, 1.4, 1.0])  # Enhance blue/cyan
        img_array = img_array * tint
        
    elif planet_type == 'darkness':
        # Add deep purple/black with subtle highlights
        tint = np.array([0.9, 0.7, 1.1, 1.0])  # Enhance purple
        img_array = img_array * tint
    
    # Clamp values
    img_array = np.clip(img_array, 0, 255)
    
    return Image.fromarray(img_array.astype(np.uint8))

def add_soft_glow(img):
    """Add soft bloom glow edges"""
    # Create a glow effect
    glow = img.filter(ImageFilter.GaussianBlur(radius=8))
    
    # Enhance the glow
    enhancer = ImageEnhance.Brightness(glow)
    glow = enhancer.enhance(1.5)
    
    # Blend with original
    glowing = Image.blend(img, glow, 0.3)
    
    return glowing

def add_surface_details(img, planet_type):
    """Add subtle surface details for lighting effects"""
    img_array = np.array(img)
    height, width = img_array.shape[:2]
    
    # Create subtle noise pattern
    noise = np.random.normal(0, 8, (height, width, 1))
    
    if planet_type == 'heart':
        # Organic, flowing patterns
        for i in range(height):
            for j in range(width):
                wave = 5 * np.sin(i * 0.02) * np.cos(j * 0.02)
                noise[i, j] += wave
                
    elif planet_type == 'lightning':
        # Sharp, electrical patterns
        for i in range(0, height, 20):
            for j in range(0, width, 20):
                if np.random.random() > 0.8:
                    cv2.line(img_array, (j, i), (j + np.random.randint(-10, 10), i + np.random.randint(-10, 10)), 
                            (255, 255, 255, 50), 1)
                            
    elif planet_type == 'water':
        # Fluid, ripple patterns
        for i in range(height):
            for j in range(width):
                ripple = 3 * np.sin(np.sqrt((i-height/2)**2 + (j-width/2)**2) * 0.01)
                noise[i, j] += ripple
                
    elif planet_type == 'darkness':
        # Mysterious, shadow patterns
        for i in range(height):
            for j in range(width):
                shadow = 4 * np.sin(i * 0.01) * np.sin(j * 0.015)
                noise[i, j] += shadow
    
    # Apply noise subtly
    noise = np.repeat(noise, 4, axis=2)
    img_array = img_array.astype(np.float64) + noise * 0.1
    img_array = np.clip(img_array, 0, 255)
    
    return Image.fromarray(img_array.astype(np.uint8))

def remove_background(img):
    """Remove background and create proper transparency"""
    img_array = np.array(img)
    
    # Create circular mask for planet shape
    height, width = img_array.shape[:2]
    center_x, center_y = width // 2, height // 2
    radius = min(width, height) // 2 - 50  # Leave some margin
    
    y, x = np.ogrid[:height, :width]
    mask = (x - center_x) ** 2 + (y - center_y) ** 2 <= radius ** 2
    
    # Apply mask to alpha channel
    img_array[:, :, 3] = np.where(mask, img_array[:, :, 3], 0)
    
    # Smooth the edges
    alpha = img_array[:, :, 3]
    alpha_smooth = cv2.GaussianBlur(alpha, (15, 15), 0)
    img_array[:, :, 3] = alpha_smooth
    
    return Image.fromarray(img_array)

def main():
    # Define the planet mappings
    planets = {
        'heart_original.png': ('planet_heart.png', 'heart'),
        'lightning_original.png': ('planet_lightning.png', 'lightning'),
        'water_original.png': ('planet_water.png', 'water'),
        'darkness_original.png': ('planet_darkness.png', 'darkness')
    }
    
    # Process each planet
    for input_file, (output_file, planet_type) in planets.items():
        if os.path.exists(input_file):
            print(f"Processing {input_file} -> {output_file}")
            create_seamless_texture(input_file, output_file, planet_type)
        else:
            print(f"Warning: {input_file} not found")
    
    print("All planet textures created!")

if __name__ == "__main__":
    main()