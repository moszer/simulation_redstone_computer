import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './styles/App.css';
import './styles/MachineCodeView.css';
import './styles/global.css';
import ThemeSelector from './components/ThemeSelector';
import Swal from 'sweetalert2';

// --- ISA Constants ---
// (Constants remain the same as provided)
const registersConst = Object.fromEntries(Array.from({ length: 16 }, (_, i) => [`R${i}`, i]));
const opcodesConst = {
    'NOP': { code: 0x0, types: [] },
     'LDI': { code: 0x1, types: ['R', 'I'] }, // User request: 0001
     // 'HLT': { code: 0x1, types: [] }, // Commented out due to conflict with LDI=0x1
     'ADD': { code: 0x2, types: ['R', 'R', 'R'] }, // User request: 0010
     'SUB': { code: 0x3, types: ['R', 'R', 'R'] }, // User request: 0011
     'BRH': { code: 0x4, types: ['C', 'A'] }, // User request: 0100
     // 'NOR': { code: 0x4, types: ['R', 'R', 'R'] }, // Commented out due to conflict with BRH=0x4
     'JMP': { code: 0x5, types: ['A'] }, // User request: 0101
     // 'AND': { code: 0x5, types: ['R', 'R', 'R'] }, // Commented out due to conflict with JMP=0x5
     'XOR': { code: 0x6, types: ['R', 'R', 'R'] }, // Original
     'RSH': { code: 0x7, types: ['R', 'R'] }, // Original
     'ADI': { code: 0x9, types: ['R', 'I'] }, // Original
     'CAL': { code: 0xC, types: ['A'] }, // Original
     'RET': { code: 0xD, types: [] }, // Original
     'LOD': { code: 0xE, types: ['R', 'R', 'O'] }, // Original
     'STR': { code: 0xF, types: ['R', 'R', 'O'] }, // Original
     // NOTE: HLT, NOR, AND are now unavailable unless their opcodes are changed.
};
const conditionsConst = { 'EQ': 0b00, 'NE': 0b01, 'GE': 0b10, 'LT': 0b11 };
const ADDRConst = {
    PIXEL_X: 240, PIXEL_Y: 241, DRAW_PIXEL: 242, CLEAR_PIXEL: 243,
    LOAD_PIXEL: 244, BUFFER_SCREEN: 245, CLEAR_SCR_BUF: 246,
    RNG: 254, CONTROLLER: 255,
};
const INST_MEM_SIZE_BYTES = 2048;
const INST_MEM_SIZE_WORDS = INST_MEM_SIZE_BYTES / 2; // Max number of 16-bit instructions (1024)
const DATA_MEM_SIZE = 256; const NUM_REGISTERS = 16;
const STACK_DEPTH = 16; const SCREEN_WIDTH = 10; const SCREEN_HEIGHT = 9;
const MAX_INTERACTION_LOG_SIZE = 100; // Limit log size

// --- Default Assembly Code ---
// *** UPDATED defaultAssemblyCode to Bouncing Ball ***
const defaultAssemblyCode = `
// Bouncing Ball Demo (Clears previous pixel)
LDI r1, 1      // ball_x = 1
LDI r2, 1      // ball_y = 1
LDI r3, 1      // dx = 1
LDI r4, 1      // dy = 1
LDI r5, 10      // WIDTH = 9 (0-9)
LDI r6, 9      // HEIGHT = 8 (0-8)
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
`;

// --- Assembler Logic (1-based Word Address Modification) ---
// (No changes needed from previous version)
class EightBitCPUSimulatorAssembler {
    constructor() {
        this.registers = registersConst; this.opcodes = opcodesConst; this.conditions = conditionsConst;
        this.labels = {}; this.machineCode = [];
        this.currentWordAddress = 1; // *** Start word address from 1 ***
        this.logs = [];
    }
    log(message) { this.logs.push(message); }
    _parseOperand(operand, operandType, lineNum) {
        operand = operand.trim().toUpperCase();
        if (operandType === 'R') { if (operand in this.registers) return this.registers[operand]; throw new Error(`L${lineNum}: Invalid register '${operand}'`); }
        if (operandType === 'I') { let v=parseInt(operand); if(isNaN(v)) throw new Error(`L${lineNum}: Invalid immediate '${operand}'`); if(v>=-128&&v<=255) return v&0xFF; throw new Error(`L${lineNum}: Immediate '${operand}' out of range (-128 to 255)`); }
        if (operandType === 'A') {
            if (operand in this.labels) return this.labels[operand]; // Label resolves to 1-based word address
            let v=parseInt(operand);
            if(isNaN(v)) throw new Error(`L${lineNum}: Undefined label or invalid address '${operand}'`);
            if(v>=1 && v <= INST_MEM_SIZE_WORDS) return v; // Target is 1-based word address
            throw new Error(`L${lineNum}: Word Address '${operand}' out of range (1-${INST_MEM_SIZE_WORDS})`);
        }
        if (operandType === 'C') { if (operand in this.conditions) return this.conditions[operand]; throw new Error(`L${lineNum}: Invalid condition '${operand}'`); }
        if (operandType === 'O') { let v=parseInt(operand); if(isNaN(v)) throw new Error(`L${lineNum}: Invalid offset '${operand}'`); if(v>=-8&&v<=7) return v&0x0F; throw new Error(`L${lineNum}: Offset '${operand}' out of range (-8 to 7)`); }
        throw new Error(`L${lineNum}: Unknown operand type '${operandType}'`);
    }
    _encodeInstruction(mnemonic, operandsValues, operandTypes, lineNum) {
        const opInfo = this.opcodes[mnemonic]; if (!opInfo) throw new Error(`L${lineNum}: Mnemonic not found '${mnemonic}'`); let inst = opInfo.code << 12;
        if (['ADD','SUB','NOR','AND','XOR'].includes(mnemonic)) { const [ra,rb,rc]=operandsValues; inst|=(ra<<8)|(rb<<4)|rc; }
        else if (mnemonic==='RSH') { const [ra,rc]=operandsValues; inst|=(ra<<8)|rc; }
        else if (['LDI','ADI'].includes(mnemonic)) { const [ra,imm]=operandsValues; inst|=(ra<<8)|imm; }
        else if (['JMP','CAL'].includes(mnemonic)) {
            const wordAddr=operandsValues[0]; if (wordAddr < 1 || wordAddr > 1024) throw new Error(`L${lineNum}: Target address ${wordAddr} out of encodable range (1-1024) for ${mnemonic}`);
            inst |= (wordAddr & 0x3FF);
        }
        else if (mnemonic==='BRH') {
            const [cond,wordAddr]=operandsValues; if (wordAddr < 1 || wordAddr > 1024) throw new Error(`L${lineNum}: Target address ${wordAddr} out of encodable range (1-1024) for ${mnemonic}`);
            inst|=(cond<<10)|(wordAddr&0x3FF);
        }
        else if (['LOD','STR'].includes(mnemonic)) { const [ra,rb,offset]=operandsValues; inst|=(ra<<8)|(rb<<4)|offset; }
        else if (!['NOP','HLT','RET'].includes(mnemonic)) {
             if (['HLT', 'NOR', 'AND'].includes(mnemonic)) { throw new Error(`L${lineNum}: Mnemonic '${mnemonic}' is currently unavailable due to opcode conflict. Please assign a new opcode.`); }
             throw new Error(`L${lineNum}: Encoding not implemented for '${mnemonic}'`);
        }
        return inst;
    }
    _preprocessLine(line) { return line.replace(/\/\/.*$/, '').trim(); }
    _expandPseudoInstructions(mnemonic,operands,lineNum){ mnemonic=mnemonic.toUpperCase(); if(!('R0' in this.registers)) throw new Error("R0 missing"); switch(mnemonic){ case 'CMP': if(operands.length!==2) throw new Error(`L${lineNum}: CMP expects 2 operands`); return{mnemonic:'SUB',operands:[operands[0],operands[1],'R0']}; case 'MOV': if(operands.length!==2) throw new Error(`L${lineNum}: MOV expects 2 operands`); return{mnemonic:'ADD',operands:[operands[0],'R0',operands[1]]}; case 'NEG': if(operands.length!==2) throw new Error(`L${lineNum}: NEG expects 2 operands`); return{mnemonic:'SUB',operands:['R0',operands[0],operands[1]]}; case 'INC': if(operands.length!==1) throw new Error(`L${lineNum}: INC expects 1 operand`); return{mnemonic:'ADI',operands:[operands[0],'1']}; case 'DEC': if(operands.length!==1) throw new Error(`L${lineNum}: DEC expects 1 operand`); return{mnemonic:'ADI',operands:[operands[0],'-1']}; case 'LSH': if(operands.length!==2) throw new Error(`L${lineNum}: LSH expects 2 operands`); return{mnemonic:'ADD',operands:[operands[0],operands[0],operands[1]]}; case 'NOT': if(operands.length!==2) throw new Error(`L${lineNum}: NOT expects 2 operands`); return{mnemonic:'NOR',operands:[operands[0],'R0',operands[1]]}; default: return{mnemonic,operands}; } }
    assemble(asmCode) {
        this.labels = {}; this.machineCode = []; this.currentWordAddress = 1; this.logs = [];
        const lines = asmCode.split('\n'); const processedLines = []; this.log("--- Assembler: First Pass (1-based Word Addr) ---");
        lines.forEach((line, i) => { const lineNum=i+1; const processed=this._preprocessLine(line); if(!processed) return; if(processed.endsWith(':')){ const label=processed.slice(0,-1).trim().toUpperCase(); if(!label) throw new Error(`L${lineNum}: Empty label`); if(label in this.labels) throw new Error(`L${lineNum}: Duplicate label '${label}'`); if(!/^[A-Z_][A-Z0-9_]*$/.test(label)) throw new Error(`L${lineNum}: Invalid label name '${label}'`); this.log(`Found label '${label}' at Word Addr ${this.currentWordAddress}`); this.labels[label]=this.currentWordAddress; processedLines.push({line:processed,num:lineNum,isLabelOnly:true}); } else { processedLines.push({line:processed,num:lineNum,isLabelOnly:false}); this.currentWordAddress += 1; } });
        this.currentWordAddress = 1; this.log("\n--- Assembler: Second Pass (1-based Word Addr) ---");
        processedLines.forEach(lineInfo => { if (lineInfo.isLabelOnly) return; const {line,num:lineNum}=lineInfo; const currentByteAddress = (this.currentWordAddress - 1) * 2; this.log(`Processing L${lineNum}: ${line} (@ Word Addr ${this.currentWordAddress})`); const parts=line.split(/\s+/); let mnemonic=parts[0]; const operandsStr=parts.slice(1).join(' '); let operands=operandsStr?operandsStr.split(',').map(op => op.trim()):[]; const expanded=this._expandPseudoInstructions(mnemonic,operands,lineNum); mnemonic=expanded.mnemonic.toUpperCase(); operands=expanded.operands; this.log(` -> Expanded/Base: ${mnemonic} ${operands.join(', ')}`);
        if(!(mnemonic in this.opcodes)) {
             if (['HLT', 'NOR', 'AND'].includes(mnemonic)) { throw new Error(`L${lineNum}: Mnemonic '${mnemonic}' is currently unavailable due to opcode conflict. Please assign a new opcode in opcodesConst.`); }
             throw new Error(`L${lineNum}: Unknown mnemonic '${mnemonic}'`);
        }
        const {types:expectedTypes}=this.opcodes[mnemonic]; if(['LOD','STR'].includes(mnemonic)&&operands.length===2&&expectedTypes.length===3) operands.push('0'); if(operands.length!==expectedTypes.length) throw new Error(`L${lineNum}: '${mnemonic}' expects ${expectedTypes.length} operands, got ${operands.length}`); const operandsValues=operands.map((op,i)=>this._parseOperand(op,expectedTypes[i],lineNum)); const instructionWord=this._encodeInstruction(mnemonic,operandsValues,expectedTypes,lineNum); const byte1=(instructionWord>>8)&0xFF; const byte2=instructionWord&0xFF; this.machineCode.push(byte1,byte2); this.log(` -> Encoded: 0x${instructionWord.toString(16).padStart(4,'0')} (Target Word Addr: ${mnemonic === 'JMP' || mnemonic === 'CAL' || mnemonic === 'BRH' ? (instructionWord & 0x3FF) : 'N/A'}) @ Byte Addr 0x${currentByteAddress.toString(16).padStart(4,'0')}`); this.currentWordAddress += 1; });
        this.log("\n--- Assembly Successful ---"); return {machineCode:new Uint8Array(this.machineCode),logs:this.logs};
    }
}

// --- Simulator Logic (1-based Word Address Modification) ---
// (No changes needed from previous version)
class EightBitCPUSimulator {
    constructor() { this.maxCycles = 1000000; this.reset(); }
    reset() { this.registers=new Uint8Array(NUM_REGISTERS); this.pc=1; this.flags={Z:0,C:0}; this.stack=[]; this.halted=false; this.instructionMemory=new Uint8Array(INST_MEM_SIZE_BYTES); this.dataMemory=new Uint8Array(DATA_MEM_SIZE); this.pixelX=0; this.pixelY=0; this.cycleCount=0; this.screenBuffer=Array(SCREEN_HEIGHT).fill(0).map(()=>Array(SCREEN_WIDTH).fill(0)); this.ioReadTrigger=null; this.screenUpdateTrigger=null; }
    loadCode(machineCode) { this.reset(); if(machineCode.length > INST_MEM_SIZE_BYTES) throw new Error("Machine code too large for byte buffer."); this.instructionMemory.set(machineCode); }
    _fetch() { if (this.pc < 1 || this.pc > INST_MEM_SIZE_WORDS) { throw new Error(`PC (Word Addr ${this.pc}) is out of bounds (1-${INST_MEM_SIZE_WORDS})`); } const byteAddress = (this.pc - 1) * 2; const byte1 = this.instructionMemory[byteAddress]; const byte2 = this.instructionMemory[byteAddress + 1]; return (byte1 << 8) | byte2; }
    _setFlags(result,carry=null) { this.flags.Z=(result&0xFF)===0?1:0; if(carry!==null) this.flags.C=carry; }
    _aluOp(op,valA,valB) { let result=0,carry=0; valA&=0xFF; valB&=0xFF; switch(op){ case 'ADD': case 'ADI': result=valA+valB; carry=(result>0xFF)?1:0; result&=0xFF; break; case 'SUB': result=valA+((~valB&0xFF)+1); carry=(result>0xFF)?1:0; result&=0xFF; break; case 'NOR': result=(~(valA|valB))&0xFF; break; case 'AND': result=(valA&valB)&0xFF; break; case 'XOR': result=(valA^valB)&0xFF; break; case 'RSH': result=(valA>>1)&0xFF; this._setFlags(result,0); return result; default: throw new Error(`Unknown ALU op: ${op}`); } this._setFlags(result,carry); return result; }
    _readMem(address) { address&=0xFF; switch(address){ case ADDRConst.LOAD_PIXEL: const px=this.pixelX&0x1F, py=this.pixelY&0x1F; return (px<SCREEN_WIDTH&&py<SCREEN_HEIGHT)?this.screenBuffer[py][px]:0; case ADDRConst.RNG: return Math.floor(Math.random()*256); case ADDRConst.CONTROLLER: return this.ioReadTrigger?this.ioReadTrigger(address):0; case ADDRConst.PIXEL_X: case ADDRConst.PIXEL_Y: case ADDRConst.DRAW_PIXEL: case ADDRConst.CLEAR_PIXEL: case ADDRConst.BUFFER_SCREEN: case ADDRConst.CLEAR_SCR_BUF: return 0; default: if(address<DATA_MEM_SIZE) return this.dataMemory[address]; console.warn(`Read invalid data memory addr 0x${address.toString(16)}`); return 0; } }
    _writeMem(address,value) { address&=0xFF; value&=0xFF; switch(address){ case ADDRConst.PIXEL_X: this.pixelX=value&0x1F; return; case ADDRConst.PIXEL_Y: this.pixelY=value&0x1F; return; case ADDRConst.DRAW_PIXEL: {const px=this.pixelX, py=this.pixelY; if(px<SCREEN_WIDTH&&py<SCREEN_HEIGHT) this.screenBuffer[py][px]=1; return;} case ADDRConst.CLEAR_PIXEL: {const px=this.pixelX, py=this.pixelY; if(px<SCREEN_WIDTH&&py<SCREEN_HEIGHT) this.screenBuffer[py][px]=0; return;} case ADDRConst.BUFFER_SCREEN: if(this.screenUpdateTrigger) this.screenUpdateTrigger([...this.screenBuffer.map(row=>[...row])]); return; case ADDRConst.CLEAR_SCR_BUF: this.screenBuffer=Array(SCREEN_HEIGHT).fill(0).map(()=>Array(SCREEN_WIDTH).fill(0)); if(this.screenUpdateTrigger) this.screenUpdateTrigger([...this.screenBuffer.map(row=>[...row])]); return; case ADDRConst.LOAD_PIXEL: case ADDRConst.RNG: case ADDRConst.CONTROLLER: return; default: if(address<DATA_MEM_SIZE) this.dataMemory[address]=value; else console.warn(`Write invalid data memory addr 0x${address.toString(16)}`); } }
    executeInstruction(instruction) {
        this.registers[0]=0; const opcode=(instruction>>12)&0xF; let nextPc=this.pc + 1;
        const raIdx=(instruction>>8)&0xF, rbIdx=(instruction>>4)&0xF, rcIdx=instruction&0xF;
        const imm=instruction&0xFF, signedImm=(imm>127)?imm-256:imm;
        const offsetRaw=instruction&0xF, offset=(offsetRaw>7)?offsetRaw-16:offsetRaw;
        const wordAddressTarget=instruction&0x3FF; const cond=(instruction>>10)&0x3;
        try {
            switch(opcode){
                case 0x0: break; // NOP
                case 0x1: // LDI
                    if(raIdx!==0)this.registers[raIdx]=imm; break;
                case 0x2: case 0x3: case 0x6: // ADD, SUB, XOR
                    {const opMap={0x2:'ADD',0x3:'SUB', 0x6:'XOR'};
                     if (opMap[opcode]) { const res=this._aluOp(opMap[opcode],this.registers[raIdx],this.registers[rbIdx]); if(rcIdx!==0)this.registers[rcIdx]=res; }
                     else { throw new Error(`Opcode 0x${opcode.toString(16)} mapped to unavailable ALU operation.`); } break;}
                case 0x7: // RSH
                    {const res=this._aluOp('RSH',this.registers[raIdx],0); if(rcIdx!==0)this.registers[rcIdx]=res; break;}
                case 0x9: // ADI
                    {const res=this._aluOp('ADI',this.registers[raIdx],signedImm); if(raIdx!==0)this.registers[raIdx]=res; break;}
                case 0x4: // BRH - Target is 1-based wordAddressTarget
                    {let branch=false; switch(cond){case 0b00: branch=(this.flags.Z===1);break; case 0b01: branch=(this.flags.Z===0);break; case 0b10: branch=(this.flags.C===1);break; case 0b11: branch=(this.flags.C===0);break;}
                     if(branch) { if (wordAddressTarget == 0) throw new Error("BRH target address cannot be 0 in 1-based addressing."); nextPc=wordAddressTarget; } break;}
                case 0x5: // JMP - Target is 1-based wordAddressTarget
                     if (wordAddressTarget == 0) throw new Error("JMP target address cannot be 0 in 1-based addressing."); nextPc=wordAddressTarget; break;
                case 0xC: // CAL - Target is 1-based wordAddressTarget, push next word address
                     if (wordAddressTarget == 0) throw new Error("CAL target address cannot be 0 in 1-based addressing.");
                    if(this.stack.length<STACK_DEPTH){this.stack.push(nextPc); nextPc=wordAddressTarget;} else throw new Error("Stack Overflow"); break;
                case 0xD: // RET - Pop 1-based word address
                    if(this.stack.length>0) nextPc=this.stack.pop(); else throw new Error("Stack Underflow"); break;
                case 0xE: // LOD - Data memory access is still byte based
                    {const memAddr=(this.registers[raIdx]+offset)&0xFF; const val=this._readMem(memAddr); if(rbIdx!==0)this.registers[rbIdx]=val; break;}
                case 0xF: // STR - Data memory access is still byte based
                    {const memAddr=(this.registers[raIdx]+offset)&0xFF; const val=this.registers[rbIdx]; this._writeMem(memAddr,val); break;}
                default:
                     if (opcode === 0x8 || opcode === 0xA || opcode === 0xB) { throw new Error(`Opcode 0x${opcode.toString(16)} executed but is currently unassigned or conflicts.`); }
                     throw new Error(`Unknown Opcode Execution: 0x${opcode.toString(16)}`);
            }
             if (nextPc < 1 || nextPc > INST_MEM_SIZE_WORDS) { throw new Error(`Next PC target (Word Addr ${nextPc}) is out of instruction memory bounds (1-${INST_MEM_SIZE_WORDS}).`); }
        } catch(e) { this.halted=true; console.error(`Runtime Error @ PC (Word Addr ${this.pc}): ${e.message}`); throw e; }
        this.pc=nextPc; this.registers[0]=0;
    }
    step() { if(this.halted) return false; try {const instruction=this._fetch(); this.executeInstruction(instruction); this.cycleCount++; if(this.cycleCount>=this.maxCycles){console.warn("Max cycles reached"); this.halted=true;} } catch(e){this.halted=true; return false;} return !this.halted; }
    getState() { return {registers:Array.from(this.registers), pc:this.pc, flags:{...this.flags}, stack:[...this.stack], halted:this.halted, cycleCount:this.cycleCount, screenBuffer:[...this.screenBuffer.map(row=>[...row])]}; }
}


// --- React Components ---

// MachineCodeView (No changes needed)
const MachineCodeView = ({ machineCode, currentPC, isByteSwapped, onBinaryLineClick, selectedBinaryAddr }) => {
    const containerRef = useRef(null);
    const currentInstructionRef = useRef(null);
    const [autoScroll, setAutoScroll] = useState(false);

    // Add useEffect for auto-scrolling
    useEffect(() => {
        if (!autoScroll || !currentInstructionRef.current || !containerRef.current) return;

        const container = containerRef.current;
        const currentInstruction = currentInstructionRef.current;

        // Calculate if the current instruction is fully visible
        const containerRect = container.getBoundingClientRect();
        const instructionRect = currentInstruction.getBoundingClientRect();

        // If the current instruction is not fully visible, scroll it into view
        if (instructionRect.top < containerRect.top || instructionRect.bottom > containerRect.bottom) {
            currentInstruction.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }, [currentPC, autoScroll]);

    const getHighlightClassForLogicalBit = (opcode, logicalBitIndex) => {
        if (logicalBitIndex < 4) return 'bin-opcode';
        switch (opcode) {
            case 0x2: case 0x3: case 0x6: if (logicalBitIndex < 8) return 'bin-reg'; if (logicalBitIndex < 12) return 'bin-reg'; return 'bin-reg';
            case 0x7: if (logicalBitIndex < 8) return 'bin-reg'; if (logicalBitIndex < 12) return 'bin-unused'; return 'bin-reg';
            case 0x1: case 0x9: if (logicalBitIndex < 8) return 'bin-reg'; return 'bin-imm';
            case 0x5: case 0xC: if (logicalBitIndex < 6) return 'bin-unused'; return 'bin-addr';
            case 0x4: if (logicalBitIndex < 6) return 'bin-cond'; return 'bin-addr';
            case 0xE: case 0xF: if (logicalBitIndex < 8) return 'bin-reg'; if (logicalBitIndex < 12) return 'bin-reg'; return 'bin-offset';
            default: return 'bin-unused';
        }
    };

    const renderLogicalInstructionGridCells = (byte1, byte2) => {
        const instructionWord = (byte1 << 8) | byte2;
        const opcode = (instructionWord >> 12) & 0xF;
        const fullBin = instructionWord.toString(2).padStart(16, '0');
        const logicalCells = [];
        for (let logicalBitIndex = 0; logicalBitIndex < 16; logicalBitIndex++) {
            const bitValue = fullBin[logicalBitIndex];
            const highlightClass = getHighlightClassForLogicalBit(opcode, logicalBitIndex);
            logicalCells.push(
                <div 
                    key={logicalBitIndex} 
                    className={`bit-cell ${highlightClass}`}
                    title={`Bit ${15-logicalBitIndex}: ${highlightClass.replace('bin-', '')}`}
                >
                    {bitValue}
                </div>
            );
        }
        return logicalCells;
    };

    const renderInstructionRows = (bytes) => {
        if (!bytes || bytes.length === 0) return <p style={{textAlign: 'center', color: '#666', marginTop: '10px'}}>No machine code generated.</p>;
        const instructionElements = [];
        const numInstructions = Math.floor(bytes.length / 2);
        for (let i = 1; i <= numInstructions; i += 1) {
            const currentWordAddress = i;
            const byteAddress = (i - 1) * 2;
            const byte1 = bytes[byteAddress];
            const byte2 = bytes[byteAddress + 1];
            if (byte2 === undefined) {
                instructionElements.push(
                    <div key={i} className="binary-grid-row incomplete">
                        <div className="line-number-cell">{currentWordAddress}</div>
                        <div className="bit-cell bin-unused" style={{gridColumn: '2 / span 16'}}>
                            {byte1} (Incomplete Word)
                        </div>
                    </div>
                );
                console.warn("Machine code has an odd number of bytes - last byte ignored.");
                continue;
            }
            const isCurrentInstruction = (currentWordAddress === currentPC);
            const isManuallySelected = (currentWordAddress === selectedBinaryAddr);
            const logicalCells = renderLogicalInstructionGridCells(byte1, byte2);
            const displayedCells = isByteSwapped ? [...logicalCells.slice(8), ...logicalCells.slice(0, 8)] : logicalCells;
            const rowClasses = [
                'binary-grid-row',
                isCurrentInstruction ? 'current-instruction' : '',
                isManuallySelected ? 'manual-selection-highlight' : ''
            ].filter(Boolean).join(' ');
            instructionElements.push(
                <div
                    key={i}
                    className={rowClasses}
                    onClick={() => onBinaryLineClick(currentWordAddress)}
                    style={{ cursor: 'pointer' }}
                    ref={isCurrentInstruction ? currentInstructionRef : null}
                >
                    <div className="line-number-cell">{currentWordAddress}</div>
                    {displayedCells}
                </div>
            );
        }
        return instructionElements;
    };

    const boxStyle = {
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #dee2e6',
        borderTop: 'none',
        padding: '8px',
        backgroundColor: '#fff',
        borderRadius: '0 0 4px 4px',
        position: 'relative',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
        fontFamily: 'monospace',
        fontSize: '0.9em',
    };

    const headerStyle = {
        display: 'grid',
        gridTemplateColumns: 'minmax(5em, auto) repeat(16, minmax(0, 1fr))',
        gap: '1px',
        fontFamily: 'monospace',
        fontSize: '0.85em',
        color: '#495057',
        backgroundColor: '#f8f9fa',
        padding: '12px 5px',
        border: '1px solid #dee2e6',
        borderRadius: '4px 4px 0 0',
        textAlign: 'center',
        alignItems: 'center',
        marginBottom: '2px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    };

    const headerCellStyle = { 
        padding: '4px 0', 
        overflow: 'hidden', 
        whiteSpace: 'nowrap', 
        borderRight: '1px solid #dee2e6',
        transition: 'background-color 0.2s',
    };

    const headerLabelStyle = { 
        ...headerCellStyle, 
        fontWeight: 'bold', 
        color: '#212529', 
        borderBottom: 'none', 
        padding: '4px 8px', 
        backgroundColor: '#e9ecef', 
        borderRadius: '3px',
        fontSize: '0.95em',
    };

    const headerFieldStyle = { 
        ...headerCellStyle, 
        color: '#495057', 
        borderBottom: 'none', 
        fontSize: '0.9em', 
        letterSpacing: '-0.5px',
        backgroundColor: '#f8f9fa',
    };

    const headerFieldLastStyle = { 
        ...headerFieldStyle, 
        borderRight: 'none'
    };

    const headerBitNumStyle = { 
        ...headerCellStyle, 
        fontSize: '0.9em',
        backgroundColor: '#f8f9fa',
    };

    const headerBitNumLastStyle = { 
        ...headerBitNumStyle, 
        borderRight: 'none'
    };

    const legendStyle = {
        marginTop: '15px',
        fontSize: '0.85em',
        padding: '15px',
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        backgroundColor: '#f8f9fa',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    };

    const legendItemStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        marginRight: '20px',
        marginBottom: '8px',
        padding: '4px 8px',
        backgroundColor: '#fff',
        borderRadius: '3px',
        border: '1px solid #dee2e6',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
    };

    const colorBoxStyle = {
        display: 'inline-block',
        width: '16px',
        height: '16px',
        marginRight: '8px',
        verticalAlign: 'middle',
        border: '1px solid #adb5bd',
        borderRadius: '3px',
        transition: 'transform 0.2s',
    };

    const byteLabel1 = isByteSwapped ? "Byte 2 (7..0)" : "Byte 1 (15..8)";
    const byteLabel2 = isByteSwapped ? "Byte 1 (15..8)" : "Byte 2 (7..0)";
    const fields = isByteSwapped ? ["RB/..", "RC/..", "Opcode", "RA/C"] : ["Opcode", "RA/C", "RB/..", "RC/.."];

    return (
        <div className="machine-code-container">
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '12px',
                padding: '8px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #dee2e6',
            }}>
                <label className="input-label" style={{ margin: 0, fontSize: '1em' }}>
                    Machine Code (Binary Instructions - Grid):
                </label>
                <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    fontSize: '0.9em', 
                    color: '#6c757d',
                    padding: '4px 8px',
                    backgroundColor: '#fff',
                    borderRadius: '3px',
                    border: '1px solid #dee2e6',
                }}>
                    <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                        style={{ margin: 0 }}
                    />
                    Auto-scroll
                </label>
            </div>
            <div style={headerStyle}>
                <div className="header-number-cell">NUMBER</div>
                <div style={{...headerLabelStyle, gridColumn: '2 / span 8'}}>{byteLabel1}</div>
                <div style={{...headerLabelStyle, gridColumn: '10 / span 8', borderRight:'none'}}>{byteLabel2}</div>
                <div style={{...headerFieldStyle, gridColumn: '2 / span 4'}}>{fields[0]}</div>
                <div style={{...headerFieldStyle, gridColumn: '6 / span 4'}}>{fields[1]}</div>
                <div style={{...headerFieldStyle, gridColumn: '10 / span 4'}}>{fields[2]}</div>
                <div style={{...headerFieldLastStyle, gridColumn: '14 / span 4'}}>{fields[3]}</div>
                {[7, 6, 5, 4, 3, 2, 1, 0, 7, 6, 5, 4, 3, 2, 1, 0].map((num, index) => (
                    <div key={index} style={{
                        ...(index === 15 ? headerBitNumLastStyle : headerBitNumStyle),
                        gridColumn: `${index + 2} / span 1`
                    }}>{num}</div>
                ))}
            </div>
            <div style={boxStyle} ref={containerRef}>
                {renderInstructionRows(machineCode, currentPC ?? 1)}
            </div>
            <div style={legendStyle}>
                <strong style={{ display: 'block', marginBottom: '10px', color: '#212529' }}>คำอธิบายสี:</strong>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, backgroundColor: '#ffd6d6', borderColor: '#721c24'}} className="bin-opcode"></span> Opcode</span>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, backgroundColor: '#cce5ff', borderColor: '#004085'}} className="bin-reg"></span> Register</span>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, backgroundColor: '#fff3cd', borderColor: '#856404'}} className="bin-imm"></span> Immediate</span>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, backgroundColor: '#d4edda', borderColor: '#155724'}} className="bin-addr"></span> Address</span>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, backgroundColor: '#f8d7da', borderColor: '#721c24'}} className="bin-cond"></span> Condition</span>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, backgroundColor: '#fff3cd', borderColor: '#856404'}} className="bin-offset"></span> Offset</span>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, backgroundColor: '#f8f9fa', borderColor: '#adb5bd'}} className="bin-unused"></span> ไม่ใช้งาน</span>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, outline: '2px solid #007bff', outlineOffset: '1px'}}></span> บรรทัดปัจจุบัน (PC)</span>
                <span style={legendItemStyle}><span style={{...colorBoxStyle, outline: '2px solid #28a745', outlineOffset: '1px'}}></span> บรรทัดที่เลือก (Manual)</span>
            </div>
        </div>
    );
};


// ScreenView (No changes)
const ScreenView = React.memo(({ screenBuffer }) => (
    <div className="display-section screen-view">
        <h4>Screen Output</h4>
        <div className="screen-container" style={{ '--screen-width': SCREEN_WIDTH }}>
            {screenBuffer.map((row, y) => (
                <div key={y} className="screen-row">
                    {row.map((pixel, x) => (
                        <div key={`${y}-${x}`} className={`screen-pixel ${pixel ? 'on' : 'off'}`}></div>
                    ))}
                </div>
            ))}
        </div>
    </div>
));

// RegistersView (Handles multiple selections)
const RegistersView = ({ registers, selectedRegisterIndices, onRegisterClick }) => (
    <div className="display-section registers-view">
        <h4>Registers</h4>
        <div className="registers-grid">
            {registers.map((value, index) => (
                <div
                    key={index}
                    className={`register-item ${selectedRegisterIndices.includes(index) ? 'selected-register' : ''}`}
                    onClick={() => onRegisterClick(index)}
                    style={{ cursor: 'pointer' }}
                >
                    <span className="register-name">R{index}:</span>
                    <span className="register-value">0x{value.toString(16).padStart(2, '0')}</span>
                    <span className="register-value-dec">({value})</span>
                </div>
            ))}
        </div>
    </div>
);


// SimulatorControls (No changes)
const SimulatorControls = ({ isRunning, isHalted, hasCode, onRun, onPause, onStep, onReset, speed, onSpeedChange }) => (
     <div className="controls">
          <button onClick={onRun} disabled={isRunning || !hasCode || isHalted} title="Run">▶ Run</button>
          <button onClick={onPause} disabled={!isRunning} title="Pause">❚❚ Pause</button>
          <button onClick={onStep} disabled={isRunning || !hasCode || isHalted} title="Step Forward">➡ Step</button>
          <button onClick={onReset} disabled={!hasCode} title="Reset Simulator">↺ Reset</button>
          <div className="speed-control">
                <label htmlFor="speedRange">Speed:</label>
                <input id="speedRange" type="range" min="10" max="500" step="10" value={speed} onChange={onSpeedChange} />
                <span>{speed} ms</span>
          </div>
     </div>
);

// *** UPDATED: StatusInfo displays PC (1-based Word Addr) ***
const StatusInfo = ({ isRunning, state }) => {
    const statusText = isRunning ? 'Running' : (state?.halted ? 'Halted' : 'Paused/Ready');
    const statusClass = isRunning ? 'status-running' : (state?.halted ? 'status-halted' : 'status-paused');
    const pcValue = state?.pc; // Now represents 1-based word address
    return (
        <div className={`display-section status-info ${statusClass} bg-base-200 p-2 sm:p-4 rounded-lg shadow-md transition-all duration-300`}>
            <h4 className="text-base sm:text-lg font-bold mb-2 sm:mb-4 text-base-content">Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                <div className="stat bg-base-300 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="stat-title text-sm sm:text-base text-base-content/70">State</div>
                    <div className="stat-value text-base sm:text-lg text-base-content">{statusText}</div>
                </div>
                <div className="stat bg-base-300 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="stat-title text-sm sm:text-base text-base-content/70">PC (Word Addr)</div>
                    <div className="stat-value text-base sm:text-lg text-base-content break-all">
                        {pcValue !== undefined && pcValue !== null ? 
                            `${pcValue} (Byte Addr 0x${((pcValue - 1) * 2).toString(16).padStart(4, '0')})` : 
                            '---'}
                    </div>
                </div>
                <div className="stat bg-base-300 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="stat-title text-sm sm:text-base text-base-content/70">Cycle</div>
                    <div className="stat-value text-base sm:text-lg text-base-content">{state?.cycleCount ?? 0}</div>
                </div>
                <div className="stat bg-base-300 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="stat-title text-sm sm:text-base text-base-content/70">Stack Depth</div>
                    <div className="stat-value text-base sm:text-lg text-base-content">{state?.stack?.length ?? 0}</div>
                </div>
                <div className="stat bg-base-300 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="stat-title text-sm sm:text-base text-base-content/70">Z Flag</div>
                    <div className={`stat-value text-base sm:text-lg ${state?.flags?.Z ? 'text-success' : 'text-error'}`}>
                        {state?.flags?.Z ?? '-'}
                    </div>
                </div>
                <div className="stat bg-base-300 rounded-lg p-2 sm:p-3 shadow-sm">
                    <div className="stat-title text-sm sm:text-base text-base-content/70">C Flag</div>
                    <div className={`stat-value text-base sm:text-lg ${state?.flags?.C ? 'text-success' : 'text-error'}`}>
                        {state?.flags?.C ?? '-'}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Interaction Log Component (Displays logs)
const InteractionLogView = ({ logs }) => {
    const logRef = useRef(null);
    useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
    return (
        <div className="display-section interaction-log-container">
              <h4>Interaction Log</h4>
              <pre ref={logRef} className="interaction-log">
                   {logs.length > 0 ? logs.join('\n') : 'Click on a register or run simulation...'}
              </pre>
        </div>
    );
};

// Screen Configuration Component
const ScreenConfig = ({ width, height, onWidthChange, onHeightChange }) => (
    <div className="screen-config bg-base-200 p-4 rounded-lg shadow-md mb-4">
        <h4 className="text-base font-bold mb-2 text-base-content">Screen Configuration</h4>
        <div className="grid grid-cols-2 gap-4">
            <div className="form-control">
                <label className="label">
                    <span className="label-text text-base-content">Width</span>
                </label>
                <input 
                    type="number" 
                    min="1" 
                    max="32" 
                    value={width} 
                    onChange={(e) => onWidthChange(parseInt(e.target.value) || 1)}
                    className="input input-bordered w-full" 
                />
            </div>
            <div className="form-control">
                <label className="label">
                    <span className="label-text text-base-content">Height</span>
                </label>
                <input 
                    type="number" 
                    min="1" 
                    max="32" 
                    value={height} 
                    onChange={(e) => onHeightChange(parseInt(e.target.value) || 1)}
                    className="input input-bordered w-full" 
                />
            </div>
        </div>
    </div>
);

// --- Main App Component ---
function App() {
    // State declarations
    const [assemblyCode, setAssemblyCode] = useState(defaultAssemblyCode); // Use bouncing ball
    const [machineCode, setMachineCode] = useState(null);
    const [assemblerLogs, setAssemblerLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [simState, setSimState] = useState(null); // PC here is now 1-based word address
    const [simSpeed, setSimSpeed] = useState(50);
    const [isByteSwapped, setIsByteSwapped] = useState(false);
    const [addressToLineMap, setAddressToLineMap] = useState(new Map()); // Map<wordAddress(1-based), asmLine>
    const [lineToAddressMap, setLineToAddressMap] = useState(new Map()); // Map<asmLine, wordAddress(1-based)>
    const [selectedAsmLine, setSelectedAsmLine] = useState(null);
    const [selectedRegisterIndices, setSelectedRegisterIndices] = useState([]);
    const [interactionLog, setInteractionLog] = useState([]);
    const [selectedBinaryAddr, setSelectedBinaryAddr] = useState(null); // Stores 1-based word address

    // Add theme state
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'corporate';
    });

    // Update theme when it changes
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Listen for theme change events
    useEffect(() => {
        const handleThemeChange = (event) => {
            setTheme(event.detail.theme);
        };

        window.addEventListener('themeChanged', handleThemeChange);
        
        return () => {
            window.removeEventListener('themeChanged', handleThemeChange);
        };
    }, []);

    // Refs
    const simulatorRef = useRef(null);
    const intervalRef = useRef(null);
    const editorRef = useRef(null);
    const lineNumbersRef = useRef(null);

    // Add screen dimension state
    const [screenWidth, setScreenWidth] = useState(10);
    const [screenHeight, setScreenHeight] = useState(9);

    // Initialize Simulator
    useEffect(() => {
        console.log("Initializing simulator (1-based Word Address Mode)...");
        const simulatorInstance = new EightBitCPUSimulator(); // Simulator now starts PC at 1
        simulatorRef.current = simulatorInstance;
        
        // Initialize screen buffer with current dimensions
        simulatorRef.current.screenBuffer = Array(screenHeight).fill(0).map(() => Array(screenWidth).fill(0));
        
        try { setSimState(simulatorInstance.getState()); }
        catch (error) { console.error("Error getting initial simulator state:", error); setSimState(null); }
        if (simulatorRef.current) {
            simulatorRef.current.screenUpdateTrigger = (newBuffer) => {
                 setSimState(prevState => {
                     const freshSimState = simulatorRef.current?.getState();
                     return { ...(freshSimState ?? prevState), screenBuffer: newBuffer };
                 });
            };
        } else { console.error("Simulator instance failed on mount."); setSimState(null); }
        // Automatically assemble the initial code on mount
        const timer = setTimeout(() => {
            handleAssemble(); // Assemble initial code
        }, 0);

        return () => {
            clearTimeout(timer);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // --- Callback Definitions ---
    const handlePause = useCallback(() => {
        if (!isRunning) return; setIsRunning(false); if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }, [isRunning]);

    const addInteractionLog = useCallback((message) => {
        setInteractionLog(prevLog => {
            const newLog = [...prevLog, message];
            if (newLog.length > MAX_INTERACTION_LOG_SIZE) {
                return newLog.slice(newLog.length - MAX_INTERACTION_LOG_SIZE);
            }
            return newLog;
        });
    }, []);

    // *** MODIFIED: handleAssemble uses 1-based word addresses for maps ***
    const handleAssemble = useCallback(() => {
        if (isRunning) handlePause();
        if (!simulatorRef.current) { 
            Swal.fire({
                icon: 'error',
                title: 'Simulator Error',
                text: 'Simulator not initialized. Please refresh the page.',
                confirmButtonColor: '#3085d6',
            });
            console.error("Assemble clicked before simulator is ready."); 
            setAssemblerLogs(prev => [...prev, "Error: Simulator not initialized."]); 
            return; 
        }
        const assembler = new EightBitCPUSimulatorAssembler(); // Assembler now works with 1-based word addresses internally
        try {
            console.log("Assembling code (1-based Word Address Mode)...");
            const { machineCode: mc, logs } = assembler.assemble(assemblyCode);
            setMachineCode(mc); 
            setAssemblerLogs(logs);

            // Build maps using 1-based WORD addresses from logs
            const newAddrToLineMap = new Map();
            const newLineToAddrMap = new Map();
            let currentAsmLine = null;
            const processRegex = /Processing L(\d+):.*\(.* Word Addr (\d+)\)/; // Match line and word addr

            logs.forEach(log => {
                const processMatch = log.match(processRegex);
                if (processMatch) {
                    currentAsmLine = parseInt(processMatch[1], 10);
                    const wordAddress = parseInt(processMatch[2], 10); // This is 1-based from log
                     if (!isNaN(wordAddress) && currentAsmLine !== null) {
                         if (!newAddrToLineMap.has(wordAddress)) {
                             newAddrToLineMap.set(wordAddress, currentAsmLine);
                         }
                         if (!newLineToAddrMap.has(currentAsmLine)) {
                              newLineToAddrMap.set(currentAsmLine, wordAddress);
                         }
                     }
                }
            });

            setAddressToLineMap(newAddrToLineMap);
            setLineToAddressMap(newLineToAddrMap);
            setSelectedAsmLine(null); 
            setSelectedRegisterIndices([]); 
            setSelectedBinaryAddr(null);

            // Create a new simulator instance with current screen dimensions
            const newSimulator = new EightBitCPUSimulator();
            newSimulator.screenBuffer = Array(screenHeight).fill(0).map(() => Array(screenWidth).fill(0));
            newSimulator.loadCode(mc); // Resets simulator PC to 1
            simulatorRef.current = newSimulator;
            
            setSimState(simulatorRef.current.getState());
            addInteractionLog("Assembly successful (1-based Word Addr Mode).");
            console.log("Assembly successful, code loaded, maps created (1-based Word Addr Mode).");

            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Assembly Successful',
                text: 'Code has been successfully assembled and loaded.',
                confirmButtonColor: '#3085d6',
                timer: 2000,
                timerProgressBar: true,
            });

        } catch (error) {
            console.error("Assembly failed:", error); 
            setAssemblerLogs(prev => [...prev, `\n--- ASSEMBLY FAILED ---`, `Error: ${error.message}`]);
            setMachineCode(null); 
            setAddressToLineMap(new Map()); 
            setLineToAddressMap(new Map());
            setSelectedAsmLine(null); 
            setSelectedRegisterIndices([]); 
            setSelectedBinaryAddr(null);
            if (simulatorRef.current) { 
                simulatorRef.current.reset(); 
                // Reinitialize screen buffer with current dimensions
                simulatorRef.current.screenBuffer = Array(screenHeight).fill(0).map(() => Array(screenWidth).fill(0));
                setSimState(simulatorRef.current.getState()); 
            }
            addInteractionLog(`Assembly failed: ${error.message}`);

            // Show error message with SweetAlert2
            Swal.fire({
                icon: 'error',
                title: 'Assembly Failed',
                html: `
                    <div style="text-align: left;">
                        <p><strong>Error:</strong> ${error.message}</p>
                        <p>Please check your code and try again.</p>
                    </div>
                `,
                confirmButtonColor: '#3085d6',
            });
        }
    }, [assemblyCode, isRunning, handlePause, addInteractionLog, screenHeight, screenWidth]);

    // *** MODIFIED: handleStep uses 1-based word addresses ***
    const handleStep = useCallback(() => {
         if (simulatorRef.current && !simulatorRef.current.halted) {
             const pcBefore = simulatorRef.current.pc; // pc is 1-based word address
             const regsBefore = [...simulatorRef.current.registers];
             const canContinue = simulatorRef.current.step();
             const stateAfter = simulatorRef.current.getState(); // pc is 1-based word address
             setSimState(stateAfter);
            if (!canContinue && isRunning) handlePause();

            // Use 1-based word address pcBefore with the map
            if (addressToLineMap.has(pcBefore)) setSelectedAsmLine(addressToLineMap.get(pcBefore));
            setSelectedBinaryAddr(null); // Clear manual binary highlight

            // Log uses 1-based word addresses now for PC
            let logMsg = `Step: PC=${pcBefore} -> ${stateAfter.pc}`;
            if(stateAfter.halted) logMsg += ' (HALTED)'; addInteractionLog(logMsg);
            for(let i = 0; i < NUM_REGISTERS; i++) { if (regsBefore[i] !== stateAfter.registers[i] && selectedRegisterIndices.includes(i)) { addInteractionLog(`  R${i} updated: ${regsBefore[i]} -> ${stateAfter.registers[i]}`); } }
         }
    }, [isRunning, handlePause, addressToLineMap, addInteractionLog, selectedRegisterIndices]);

    // *** MODIFIED: runSimulationCycle uses 1-based word addresses ***
    const runSimulationCycle = useCallback(() => {
              if (simulatorRef.current && !simulatorRef.current.halted) {
                  let stepsPerInterval = Math.max(1, Math.floor(50 / simSpeed)); let continueSim = true; let pcBeforeLastStep = simulatorRef.current.pc; // 1-based word address
                  const regsBeforeCycle = [...simulatorRef.current.registers];
                  for (let i = 0; i < stepsPerInterval && continueSim; i++) { if (simulatorRef.current.halted) { continueSim = false; break; } pcBeforeLastStep = simulatorRef.current.pc; continueSim = simulatorRef.current.step(); if (!continueSim) break; }
                  const finalState = simulatorRef.current.getState(); setSimState(finalState); // pc is 1-based word address
                  if (addressToLineMap.has(pcBeforeLastStep)) setSelectedAsmLine(addressToLineMap.get(pcBeforeLastStep));
                  setSelectedBinaryAddr(null); // Clear manual binary highlight
                  let changesFound = false;
                  for(let i = 0; i < NUM_REGISTERS; i++) { if (regsBeforeCycle[i] !== finalState.registers[i] && selectedRegisterIndices.includes(i)) { if (!changesFound) { addInteractionLog(`Reg changes (Cycle ${finalState.cycleCount}):`); changesFound = true; } addInteractionLog(`  R${i}: ${regsBeforeCycle[i]} -> ${finalState.registers[i]}`); } }
                  if (!continueSim || simulatorRef.current.halted) { addInteractionLog(`Run halted at PC=${finalState.pc}`); handlePause(); } // Log 1-based word address PC
               } else { handlePause(); }
    }, [simSpeed, handlePause, addressToLineMap, addInteractionLog, selectedRegisterIndices]);

    const handleRun = useCallback(() => {
        if (isRunning || !simulatorRef.current || simulatorRef.current.halted || !machineCode) return;
        addInteractionLog("Run started."); setSelectedBinaryAddr(null); // Clear manual binary highlight
        setIsRunning(true); if (intervalRef.current) clearInterval(intervalRef.current);
        runSimulationCycle(); intervalRef.current = setInterval(runSimulationCycle, Math.max(10, simSpeed));
    }, [isRunning, machineCode, simSpeed, runSimulationCycle, addInteractionLog]);

     // *** MODIFIED: handleReset uses 1-based word addresses ***
    const handleReset = useCallback(() => {
        if (isRunning) handlePause();
        setSelectedAsmLine(null); setSelectedRegisterIndices([]); setSelectedBinaryAddr(null); // Clear selections
        if (simulatorRef.current && machineCode) {
             simulatorRef.current.loadCode(machineCode); // Resets PC to 1
             // Reinitialize screen buffer with current dimensions
             simulatorRef.current.screenBuffer = Array(screenHeight).fill(0).map(() => Array(screenWidth).fill(0));
             setSimState(simulatorRef.current.getState());
             // Check word address 1 in map
             if(addressToLineMap.has(1)) setSelectedAsmLine(addressToLineMap.get(1));
             addInteractionLog("Simulator reset with current code.");
        } else if (simulatorRef.current) {
             simulatorRef.current.reset(); // Resets PC to 1
             // Reinitialize screen buffer with current dimensions
             simulatorRef.current.screenBuffer = Array(screenHeight).fill(0).map(() => Array(screenWidth).fill(0));
             setSimState(simulatorRef.current.getState());
             addInteractionLog("Simulator reset to initial state.");
        }
    }, [machineCode, isRunning, handlePause, addressToLineMap, addInteractionLog, screenHeight, screenWidth]);

    const handleToggleByteOrder = useCallback(() => { setIsByteSwapped(prev => !prev); }, []);
    const handleEditorScroll = useCallback(() => { if (editorRef.current && lineNumbersRef.current) lineNumbersRef.current.scrollTop = editorRef.current.scrollTop; }, []);

    // *** MODIFIED: handleBinaryLineClick uses 1-based word addresses ***
    const handleBinaryLineClick = useCallback((wordAddress) => { // Receives 1-based word address
        setSelectedBinaryAddr(null); // Clear manual binary highlight
        if (addressToLineMap.has(wordAddress)) { const line = addressToLineMap.get(wordAddress); setSelectedAsmLine(line); addInteractionLog(`Selected instruction @ Word Addr ${wordAddress} (Asm Line ${line})`); }
        else { setSelectedAsmLine(null); addInteractionLog(`Clicked instruction @ Word Addr ${wordAddress} (No assembly line mapping found)`); }
    }, [addressToLineMap, addInteractionLog]);

    const handleRegisterClick = useCallback((index) => {
        setSelectedRegisterIndices(prevIndices => {
            const newIndices = new Set(prevIndices); let action = '';
            if (newIndices.has(index)) { newIndices.delete(index); action = 'Deselected'; }
            else { newIndices.add(index); action = 'Selected'; }
            if (simState?.registers?.[index] !== undefined) { const value = simState.registers[index]; addInteractionLog(`${action} R${index}: Value ${value}`); }
            else { addInteractionLog(`${action} R${index}: Value unavailable`); }
            return Array.from(newIndices);
        });
    }, [simState, addInteractionLog]);

      // *** MODIFIED: handleAsmLineClick uses 1-based word addresses ***
      const handleAsmLineClick = useCallback((lineNumber) => {
        setSelectedAsmLine(lineNumber);
        addInteractionLog(`Selected Assembly Line ${lineNumber}`);
        // Find corresponding 1-based word address and set manual binary highlight
        if (lineToAddressMap.has(lineNumber)) {
            setSelectedBinaryAddr(lineToAddressMap.get(lineNumber));
        } else {
            setSelectedBinaryAddr(null); // Clear if no mapping
        }
    }, [addInteractionLog, lineToAddressMap]);

    // Calculate line numbers for display (now with onClick)
    const editorLineHeight = '1.5em'; // Keep this consistent with CSS if defined there
    const lineNumbersElements = useMemo(() => {
        return assemblyCode.split('\n').map((_, i) => {
            const lineNumber = i + 1;
            const isSelected = lineNumber === selectedAsmLine;
            return (
                <span
                    key={lineNumber}
                    className={isSelected ? 'asm-line-number highlighted-asm-line' : 'asm-line-number'}
                    onClick={() => handleAsmLineClick(lineNumber)} // Add onClick handler
                    style={{ cursor: 'pointer' }} // Add pointer cursor (redundant if in CSS)
                >
                    {lineNumber}
                </span>
            );
        });
    }, [assemblyCode, selectedAsmLine, handleAsmLineClick]);

    // Add handlers for screen dimension changes
    const handleScreenWidthChange = useCallback((newWidth) => {
        if (newWidth >= 1 && newWidth <= 32) {
            setScreenWidth(newWidth);
            // Reinitialize screen buffer with new dimensions
            if (simulatorRef.current) {
                simulatorRef.current.screenBuffer = Array(screenHeight).fill(0).map(() => Array(newWidth).fill(0));
                setSimState(prevState => ({
                    ...prevState,
                    screenBuffer: simulatorRef.current.screenBuffer
                }));
            }
        }
    }, [screenHeight]);
    
    const handleScreenHeightChange = useCallback((newHeight) => {
        if (newHeight >= 1 && newHeight <= 32) {
            setScreenHeight(newHeight);
            // Reinitialize screen buffer with new dimensions
            if (simulatorRef.current) {
                simulatorRef.current.screenBuffer = Array(newHeight).fill(0).map(() => Array(screenWidth).fill(0));
                setSimState(prevState => ({
                    ...prevState,
                    screenBuffer: simulatorRef.current.screenBuffer
                }));
            }
        }
    }, [screenWidth]);

    // --- JSX Rendering ---
    return (
        <div className="min-h-screen bg-base-300 transition-all duration-300">
            <div className="navbar bg-base-300 shadow-lg transition-all duration-300">
                <div className="flex-1">
                    <a className="btn btn-ghost text-xl transition-all duration-300 hover:bg-base-200 text-base-content">8bit CPU Simulator</a>
                </div>
                <div className="flex-none gap-2">
                    <div className="tooltip tooltip-left" data-tip="Change Theme">
                        <ThemeSelector />
                    </div>
                </div>
            </div>
            <main className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Panel */}
                    <section className="panel editor-panel bg-base-200 transition-all duration-300 hover:shadow-lg hover:bg-base-200/90 rounded-lg p-4">
                        <h2 className="panel-title transition-all duration-300 hover:text-primary text-base-content text-xl font-bold mb-4">Code & Assembly</h2>
                        <div className="editor-container">
                            <label htmlFor="assemblyEditor" className="input-label transition-all duration-300 hover:text-primary text-base-content block mb-2">Assembly Code:</label>
                            <div className="editor-wrapper relative">
                                <div ref={lineNumbersRef} className="line-numbers-display transition-all duration-300 hover:bg-base-300/50 text-base-content/70 absolute left-0 top-0 h-full overflow-y-auto" aria-hidden="true">
                                    {lineNumbersElements}
                                </div>
                                <textarea
                                    ref={editorRef}
                                    id="assemblyEditor"
                                    value={assemblyCode}
                                    onChange={(e) => setAssemblyCode(e.target.value)}
                                    onScroll={handleEditorScroll}
                                    spellCheck="false"
                                    className="code-editor transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/50 hover:bg-base-300/50 text-base-content w-full h-64 pl-12"
                                    placeholder="Enter 8bit CPU assembly code..."
                                />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                <button 
                                    onClick={handleAssemble} 
                                    className="btn btn-primary transition-all duration-300 hover:scale-105 active:scale-95"
                                >
                                    {machineCode ? 'Assemble ใหม่' : 'Assemble Code'}
                                </button>
                                <button 
                                    onClick={handleToggleByteOrder} 
                                    className="btn btn-secondary transition-all duration-300 hover:scale-105 active:scale-95" 
                                    title="สลับลำดับการแสดงผล Byte"
                                >
                                    สลับ Byte Order ({isByteSwapped ? 'Byte2 <-> Byte1' : 'Byte1 <-> Byte2'})
                                </button>
                            </div>
                        </div>
                        <div className="mt-6">
                            <MachineCodeView
                                machineCode={machineCode}
                                currentPC={simState?.pc}
                                isByteSwapped={isByteSwapped}
                                onBinaryLineClick={handleBinaryLineClick}
                                selectedBinaryAddr={selectedBinaryAddr}
                            />
                        </div>
                        <div className="logs-container transition-all duration-300 hover:bg-base-300/50 mt-6 p-4 rounded-lg">
                            <label className="input-label transition-all duration-300 hover:text-primary text-base-content block mb-2">ผลลัพธ์ Assembler:</label>
                            <pre className="logs transition-all duration-300 hover:bg-base-300/50 text-base-content/90 overflow-x-auto">{assemblerLogs.join('\n')}</pre>
                        </div>
                    </section>

                    {/* Right Panel */}
                    <section className="panel simulator-panel bg-base-200 transition-all duration-300 hover:shadow-lg hover:bg-base-200/90 rounded-lg p-4">
                        <h2 className="panel-title transition-all duration-300 hover:text-primary text-base-content text-xl font-bold mb-4">ส่วนควบคุมและแสดงผล Simulator</h2>
                        <div className="space-y-6">
                            <SimulatorControls
                                isRunning={isRunning} 
                                isHalted={simState?.halted ?? true} 
                                hasCode={!!machineCode}
                                onRun={handleRun} 
                                onPause={handlePause} 
                                onStep={handleStep} 
                                onReset={handleReset}
                                speed={simSpeed} 
                                onSpeedChange={(e) => setSimSpeed(Number(e.target.value))}
                            />
                            
                            {/* Add Screen Configuration Component */}
                            <ScreenConfig 
                                width={screenWidth}
                                height={screenHeight}
                                onWidthChange={handleScreenWidthChange}
                                onHeightChange={handleScreenHeightChange}
                            />
                            
                            {simState ? (
                                <div className="simulator-state-display space-y-6">
                                    <StatusInfo isRunning={isRunning} state={simState} />
                                    <RegistersView
                                        registers={simState.registers}
                                        selectedRegisterIndices={selectedRegisterIndices}
                                        onRegisterClick={handleRegisterClick}
                                    />
                                    <ScreenView screenBuffer={simState.screenBuffer} />
                                    <InteractionLogView logs={interactionLog} />
                                </div>
                            ) : (
                                <p className="info-text transition-all duration-300 hover:bg-base-300/50 hover:text-primary text-base-content/80 p-4 rounded-lg">กด "Assemble Code" เพื่อเริ่มต้น</p>
                            )}
                        </div>
                    </section>
                </div>
            </main>
            
            {/* Footer with License Information */}
            <footer className="footer footer-center p-4 bg-base-300 text-base-content border-t border-base-300 mt-6">
                <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                        <span>Licensed under</span>
                        <a 
                            href="https://github.com/moszer/simulation_redstone_computer/blob/main/LICENSE" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="badge badge-primary hover:badge-primary-focus transition-all duration-300"
                        >
                            MIT License
                        </a>
                    </div>
                    <div className="text-sm opacity-70 text-center">
                        © 2024 Pattarapon Parkodchue (
                        <a 
                            href="https://github.com/moszer" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="link link-primary hover:link-primary-focus transition-all duration-300"
                        >
                            @moszer
                        </a>
                        )
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;