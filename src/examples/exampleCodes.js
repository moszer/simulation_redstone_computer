// Example codes for the 8-bit CPU Simulator

export const exampleCodes = {
    'Bouncing Ball not comaptable in my map (not working)': `// Bouncing Ball Demo (Clears previous pixel)
LDI r1, 1      // ball_x = 1
LDI r2, 1      // ball_y = 1
LDI r3, 1      // dx = 1
LDI r4, 1      // dy = 1
LDI r5, 10     // WIDTH = 10 (0-10)
LDI r6, 9     // HEIGHT = 9 (0-9)
LDI r11, 243   // CLEAR_PIXEL address
LDI r12, 240   // X Address
LDI r13, 241   // Y Address
LDI r14, 242   // DRAW_PIXEL address
LDI r15, 245   // BUFFER_SCREEN address
LDI r8, 1      // Const 1
LDI r7, 246    // SCREEN_CLEAR address
STR r7, r8, 0  // Clear screen initially

LOOP_START:
    // Calculate next position
    ADD r1, r3, r9  // next_x = ball_x + dx
    ADD r2, r4, r10 // next_y = ball_y + dy

    // Boundary check X (if next_x < 0 or next_x >= WIDTH)
    SUB r9, r0, r7  // r7 = next_x - 0
    BRH LT, NEGATE_DX
    SUB r9, r5, r7  // r7 = next_x - WIDTH
    BRH GE, NEGATE_DX
    JMP CHECK_Y
NEGATE_DX:
    SUB r0, r3, r3  // dx = -dx
    ADD r1, r3, r9  // Recalculate next_x
CHECK_Y:
    // Boundary check Y (if next_y < 0 or next_y >= HEIGHT)
    SUB r10, r0, r7 // r7 = next_y - 0
    BRH LT, NEGATE_DY
    SUB r10, r6, r7 // r7 = next_y - HEIGHT
    BRH GE, NEGATE_DY
    JMP UPDATE_POS
NEGATE_DY:
    SUB r0, r4, r4  // dy = -dy
    ADD r2, r4, r10 // Recalculate next_y

UPDATE_POS:
    // 1. Clear the pixel at the CURRENT position (r1, r2)
    STR r12, r1, 0  // Set Pixel X to current ball_x (r1)
    STR r13, r2, 0  // Set Pixel Y to current ball_y (r2)
    STR r11, r8, 0  // Send Clear Pixel command

    // 2. Update ball coordinates to the calculated next position
    ADD r9, r0, r1  // ball_x = next_x
    ADD r10, r0, r2 // ball_y = next_y

    // 3. Draw the pixel at the NEW position (r1, r2)
    STR r12, r1, 0  // Set Pixel X to new ball_x
    STR r13, r2, 0  // Set Pixel Y to new ball_y
    STR r14, r8, 0  // Send Draw Pixel command

    // 4. Update the screen buffer to show changes
    STR r15, r8, 0  // Buffer Screen command

    // Simple Delay Loop (Using r7 as counter)
    LDI r7, 20     // Adjust delay value (Lower value = faster)
DELAY_LOOP:
    SUB r7, r8, r7  // r7 = r7 - 1
    BRH GE, DELAY_LOOP // Loop if counter (r7) >= 0

    JMP LOOP_START
    
    
`,

'Bouncing Ball compatable in my map (working)': `// Your assembly code here
// Bouncing Ball Demo (Clears previous pixel)
LDI r1, 1      // ball_x = 1
LDI r2, 1      // ball_y = 1
LDI r3, 1      // dx = 1
LDI r4, 1      // dy = 1
LDI r5, 10     // WIDTH = 10 (0-10)
LDI r6, 9     // HEIGHT = 9 (0-9)
LDI r8, 1      // Const 1

LOOP_START:
    // Calculate next position
    ADD r1, r3, r9  // next_x = ball_x + dx
    ADD r2, r4, r10 // next_y = ball_y + dy

    // Boundary check X (if next_x < 0 or next_x >= WIDTH)
    SUB r9, r0, r7  // r7 = next_x - 0
    BRH LT, NEGATE_DX
    SUB r9, r5, r7  // r7 = next_x - WIDTH
    BRH GE, NEGATE_DX
    JMP CHECK_Y
NEGATE_DX:
    SUB r0, r3, r3  // dx = -dx
    ADD r1, r3, r9  // Recalculate next_x
CHECK_Y:
    // Boundary check Y (if next_y < 0 or next_y >= HEIGHT)
    SUB r10, r0, r7 // r7 = next_y - 0
    BRH LT, NEGATE_DY
    SUB r10, r6, r7 // r7 = next_y - HEIGHT
    BRH GE, NEGATE_DY
    JMP UPDATE_POS
NEGATE_DY:
    SUB r0, r4, r4  // dy = -dy
    ADD r2, r4, r10 // Recalculate next_y

UPDATE_POS:
    // 1. Clear the pixel at the CURRENT position (r1, r2)

    // 2. Update ball coordinates to the calculated next position
    ADD r9, r0, r1  // ball_x = next_x
    ADD r10, r0, r2 // ball_y = next_y

JMP LOOP_START




`,

'Empty Template': `// Your assembly code here
// Example:
LDI r1, 1      // Load immediate value 1 into R1
ADD r1, r1, r2 // Add R1 to R1 and store in R2




`,
}; 