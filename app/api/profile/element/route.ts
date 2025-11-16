import { NextResponse } from 'next/server';

// For now, we'll use a simple in-memory store since there's no database setup
// In a real implementation, this would use the existing user profile system
let selectedElements: Record<string, string> = {};

export async function GET(request: Request) {
  try {
    // In a real implementation, you'd get the user ID from auth
    // For now, use a default user
    const userId = 'default_user';
    
    const selectedElement = selectedElements[userId] || null;
    
    return NextResponse.json({ selected_element: selectedElement });
  } catch (error) {
    console.error('Error getting selected element:', error);
    return NextResponse.json(
      { error: 'Failed to get selected element' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selected_element } = body;
    
    // Validate element
    const validElements = ['water', 'heart', 'lightning', 'darkness'];
    if (!validElements.includes(selected_element)) {
      return NextResponse.json(
        { error: 'Invalid element' },
        { status: 400 }
      );
    }
    
    // In a real implementation, you'd get the user ID from auth
    // For now, use a default user
    const userId = 'default_user';
    
    selectedElements[userId] = selected_element;
    
    return NextResponse.json({ 
      success: true, 
      selected_element 
    });
  } catch (error) {
    console.error('Error saving selected element:', error);
    return NextResponse.json(
      { error: 'Failed to save selected element' },
      { status: 500 }
    );
  }
}