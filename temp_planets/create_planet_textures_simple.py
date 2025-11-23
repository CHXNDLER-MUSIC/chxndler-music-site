#!/usr/bin/env python3
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np
import os
import math

def create_seamless_texture(image_path, output_path, planet_type):
    """
    Create a seamless planet texture with proper UV wrapping and effects
    """
    try:
        # Load the image
        img = Image.open(image_path).convert('RGBA')
        
        # Resize to 1024x1024
        img = img.resize((1024, 1024), Image.Resampling.LANCZOS)
        
        # Create seamless wrapping
        seamless = make_seamless(img)
        
        # Add planet-specific effects
        enhanced = add_planet_effects(seamless, planet_type)
        
        # Add soft bloom glow
        glowing = add_soft_glow(enhanced)
        
        # Add subtle surface details
        textured = add_surface_details(glowing, planet_type)
        
        # Create circular planet shape with smooth edges
        final = create_planet_shape(textured)
        
        # Save the result
        final.save(output_path, 'PNG', optimize=True)
        print(f"✓ Created {output_path}")
        
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

def make_seamless(img):
    """Create seamless horizontal wrapping for UV mapping"""
    width, height = img.size
    overlap = 32  # Overlap region for seamless blending
    
    # Create new image
    result = img.copy()
    
    # Get edge strips
    left_strip = img.crop((0, 0, overlap, height))
    right_strip = img.crop((width - overlap, 0, width, height))
    
    # Blend the edges
    for x in range(overlap):
        alpha = x / overlap
        for y in range(height):
            try:
                left_pixel = left_strip.getpixel((x, y))
                right_pixel = right_strip.getpixel((overlap - 1 - x, y))
                
                # Blend pixels
                blended = tuple(int(left_pixel[i] * (1 - alpha) + right_pixel[i] * alpha) for i in range(4))
                
                # Apply to both edges
                result.putpixel((x, y), blended)
                result.putpixel((width - overlap + x, y), blended)
            except:
                continue
    
    return result

def add_planet_effects(img, planet_type):
    """Add planet-specific holographic Heartverse effects"""
    img_array = np.array(img, dtype=np.float32)
    
    if planet_type == 'heart':
        # Warm pink/red holographic tint
        img_array[:, :, 0] *= 1.2  # More red
        img_array[:, :, 1] *= 0.9  # Less green
        img_array[:, :, 2] *= 1.1  # Slight blue
        
    elif planet_type == 'lightning':
        # Electric blue/purple tint
        img_array[:, :, 0] *= 0.8  # Less red
        img_array[:, :, 1] *= 0.9  # Moderate green
        img_array[:, :, 2] *= 1.4  # More blue
        
    elif planet_type == 'water':
        # Cyan/aquatic tint
        img_array[:, :, 0] *= 0.7  # Less red
        img_array[:, :, 1] *= 1.2  # More green
        img_array[:, :, 2] *= 1.4  # More blue
        
    elif planet_type == 'darkness':
        # Deep purple/dark with subtle highlights
        img_array[:, :, 0] *= 0.9  # Slight red
        img_array[:, :, 1] *= 0.7  # Less green
        img_array[:, :, 2] *= 1.1  # Slight blue
        img_array *= 0.8  # Overall darker
    
    # Clamp values
    img_array = np.clip(img_array, 0, 255)
    
    return Image.fromarray(img_array.astype(np.uint8))

def add_soft_glow(img):
    """Add soft bloom glow edges"""
    # Create glow layers
    glow_small = img.filter(ImageFilter.GaussianBlur(radius=4))
    glow_medium = img.filter(ImageFilter.GaussianBlur(radius=8))
    glow_large = img.filter(ImageFilter.GaussianBlur(radius=16))
    
    # Enhance brightness of glows
    enhancer = ImageEnhance.Brightness(glow_small)
    glow_small = enhancer.enhance(1.3)
    
    enhancer = ImageEnhance.Brightness(glow_medium)
    glow_medium = enhancer.enhance(1.2)
    
    enhancer = ImageEnhance.Brightness(glow_large)
    glow_large = enhancer.enhance(1.1)
    
    # Blend layers
    result = Image.blend(img, glow_small, 0.2)
    result = Image.blend(result, glow_medium, 0.15)
    result = Image.blend(result, glow_large, 0.1)
    
    return result

def add_surface_details(img, planet_type):
    """Add subtle surface details for lighting effects"""
    width, height = img.size
    
    # Create a detail layer
    detail_layer = Image.new('RGBA', (width, height), (128, 128, 128, 0))
    draw = ImageDraw.Draw(detail_layer)
    
    # Add planet-specific surface patterns
    if planet_type == 'heart':
        # Organic flowing patterns
        for i in range(0, height, 40):
            for j in range(0, width, 40):
                if (i + j) % 80 == 0:
                    draw.ellipse([j-5, i-5, j+5, i+5], fill=(255, 200, 200, 30))
                    
    elif planet_type == 'lightning':
        # Sharp electrical patterns
        for i in range(0, height, 30):
            for j in range(0, width, 30):
                if hash((i, j)) % 5 == 0:
                    end_x = j + (hash((i, j, 1)) % 20 - 10)
                    end_y = i + (hash((i, j, 2)) % 20 - 10)
                    draw.line([j, i, end_x, end_y], fill=(200, 200, 255, 40), width=2)
                    
    elif planet_type == 'water':
        # Fluid ripple patterns
        center_x, center_y = width // 2, height // 2
        for r in range(50, 400, 60):
            for angle in range(0, 360, 15):
                x = center_x + r * math.cos(math.radians(angle))
                y = center_y + r * math.sin(math.radians(angle))
                if 0 <= x < width and 0 <= y < height:
                    draw.ellipse([x-3, y-3, x+3, y+3], fill=(150, 220, 255, 25))
                    
    elif planet_type == 'darkness':
        # Mysterious shadow patterns
        for i in range(0, height, 50):
            for j in range(0, width, 50):
                if (i * j) % 100 == 0:
                    size = hash((i, j)) % 15 + 5
                    draw.ellipse([j-size, i-size, j+size, i+size], fill=(100, 80, 150, 20))
    
    # Apply detail layer with very low opacity
    detail_blurred = detail_layer.filter(ImageFilter.GaussianBlur(radius=2))
    result = Image.alpha_composite(img, detail_blurred)
    
    return result

def create_planet_shape(img):
    """Create circular planet shape with smooth edges and transparent background"""
    width, height = img.size
    
    # Create circular mask
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)
    
    # Calculate circle parameters
    center_x, center_y = width // 2, height // 2
    radius = min(width, height) // 2 - 20  # Leave margin for glow
    
    # Draw circle
    draw.ellipse([center_x - radius, center_y - radius, 
                  center_x + radius, center_y + radius], fill=255)
    
    # Blur mask for soft edges
    mask = mask.filter(ImageFilter.GaussianBlur(radius=3))
    
    # Create result with transparent background
    result = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    # Apply mask
    img_array = np.array(img)
    mask_array = np.array(mask)
    result_array = np.array(result)
    
    # Apply mask to alpha channel
    for i in range(height):
        for j in range(width):
            alpha_factor = mask_array[i, j] / 255.0
            result_array[i, j] = [
                img_array[i, j][0],
                img_array[i, j][1], 
                img_array[i, j][2],
                int(img_array[i, j][3] * alpha_factor)
            ]
    
    return Image.fromarray(result_array)

def main():
    # Define the planet mappings
    planets = {
        'heart_original.png': ('planet_heart.png', 'heart'),
        'lightning_original.png': ('planet_lightning.png', 'lightning'),
        'water_original.png': ('planet_water.png', 'water'),
        'darkness_original.png': ('planet_darkness.png', 'darkness')
    }
    
    print("🪐 Creating Heartverse planet textures...")
    
    # Process each planet
    for input_file, (output_file, planet_type) in planets.items():
        if os.path.exists(input_file):
            print(f"Processing {planet_type} planet...")
            create_seamless_texture(input_file, output_file, planet_type)
        else:
            print(f"⚠️  Warning: {input_file} not found")
    
    print("\n✨ All planet textures created with holographic Heartverse styling!")
    print("📁 Files created:")
    for _, (output_file, _) in planets.items():
        if os.path.exists(output_file):
            print(f"   • {output_file}")

if __name__ == "__main__":
    main()