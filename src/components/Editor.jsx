import React from 'react';

const Editor = ({ value, onChange, currentLine, isRunning }) => {
    // Function to highlight syntax
    const highlightSyntax = (line) => {
        // Remove comments first
        const commentMatch = line.match(/(;.*)$/);
        const comment = commentMatch ? commentMatch[1] : '';
        const codeWithoutComment = line.replace(/(;.*)$/, '').trim();

        // Split into parts
        const parts = codeWithoutComment.split(/\s+/);
        
        // Process each part
        const highlightedParts = parts.map(part => {
            // Check for labels
            if (part.match(/^[A-Za-z_][A-Za-z0-9_]*:$/)) {
                return `<span class="label">${part}</span>`;
            }
            // Check for registers
            if (part.match(/^[A-Za-z]+$/)) {
                return `<span class="register">${part}</span>`;
            }
            // Check for numbers
            if (part.match(/^\d+$/)) {
                return `<span class="number">${part}</span>`;
            }
            // Check for instructions
            if (part.match(/^(LDI|ADD|SUB|MOV|JMP|HLT|STR|LDR|CMP|BRH|CAL|RET|NOR|AND|XOR|RSH|ADI|LOD)$/i)) {
                return `<span class="instruction">${part}</span>`;
            }
            return part;
        });

        // Reconstruct the line with highlighting
        let highlightedLine = highlightedParts.join(' ');
        if (comment) {
            highlightedLine += ` <span class="comment">${comment}</span>`;
        }

        return highlightedLine;
    };

    // Split the code into lines and process each line
    const lines = value.split('\n');
    
    return (
        <div className="editor-container">
            <div className="code-editor">
                <div className="code-editor-line-numbers">
                    {lines.map((_, index) => (
                        <div key={index} className="line-number">
                            {index + 1}
                        </div>
                    ))}
                </div>
                <div className="code-editor-content">
                    {lines.map((line, index) => (
                        <div
                            key={index}
                            className={`code-line ${index === currentLine - 1 ? 'current' : ''}`}
                            dangerouslySetInnerHTML={{ __html: highlightSyntax(line) }}
                        />
                    ))}
                    {isRunning && currentLine > 0 && (
                        <div
                            className="code-editor-current-line"
                            style={{ top: `${(currentLine - 1) * 1.6}em` }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Editor; 