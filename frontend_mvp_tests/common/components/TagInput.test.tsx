import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TagInput from '../../../frontend/llm-interviewer-ui/src/components/common/TagInput/TagInput'; // Adjusted path

describe('TagInput Component', () => {
  const mockSetTags = jest.fn();
  const defaultPlaceholder = "Add a skill and press Enter...";

  beforeEach(() => {
    mockSetTags.mockClear();
  });

  const renderTagInput = (initialTags: string[] = [], placeholder?: string, label?: string, id?: string) => {
    return render(
      <TagInput 
        tags={initialTags} 
        setTags={mockSetTags} 
        placeholder={placeholder || defaultPlaceholder}
        label={label}
        id={id}
      />
    );
  };

  it('should render with a label if provided', () => {
    const labelText = "Skills";
    const inputId = "skills-input";
    renderTagInput([], undefined, labelText, inputId);
    const labelElement = screen.getByText(labelText);
    expect(labelElement).toBeInTheDocument();
    expect(labelElement).toHaveAttribute('for', inputId);
  });

  it('should display initial tags if provided', () => {
    const initialTags = ['React', 'TypeScript'];
    renderTagInput(initialTags);
    initialTags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('should allow adding a new tag by pressing Enter', () => {
    renderTagInput();
    const input = screen.getByPlaceholderText(defaultPlaceholder);
    fireEvent.change(input, { target: { value: 'JavaScript' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockSetTags).toHaveBeenCalledWith(['JavaScript']);
    expect(input).toHaveValue(''); // Input should clear
  });

  it('should allow adding a new tag by pressing Comma', () => {
    renderTagInput();
    const input = screen.getByPlaceholderText(defaultPlaceholder);
    fireEvent.change(input, { target: { value: 'CSS' } });
    fireEvent.keyDown(input, { key: ',', code: 'Comma' });
    expect(mockSetTags).toHaveBeenCalledWith(['CSS']);
    expect(input).toHaveValue('');
  });

  it('should not add duplicate tags', () => {
    renderTagInput(['React']);
    const input = screen.getByPlaceholderText(defaultPlaceholder);
    fireEvent.change(input, { target: { value: 'React' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    // setTags should not be called again if the tag already exists and the component handles this logic
    // The current TagInput.tsx implementation calls setTags([...tags, newTag]) only if !tags.includes(newTag)
    // So, if 'React' is already there, and we try to add 'React', setTags won't be called with ['React', 'React']
    // It will be called with ['React'] if the input was different, or not at all if it's a duplicate.
    // The component's logic is `if (newTag && !tags.includes(newTag)) { setTags([...tags, newTag]); }`
    // So, if 'React' is entered, newTag is 'React', tags.includes('React') is true, so setTags is NOT called.
    expect(mockSetTags).not.toHaveBeenCalled(); 
    expect(input).toHaveValue(''); // Input still clears
  });

  it('should not add empty or whitespace-only tags', () => {
    renderTagInput();
    const input = screen.getByPlaceholderText(defaultPlaceholder);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockSetTags).not.toHaveBeenCalled();
    expect(input).toHaveValue(''); // Input still clears
  });

  it('should allow removing a tag by clicking the remove button', () => {
    const initialTags = ['React', 'NodeJS'];
    renderTagInput(initialTags);
    const reactTagRemoveButton = screen.getByText('React').querySelector('button');
    expect(reactTagRemoveButton).toBeInTheDocument();
    if (reactTagRemoveButton) {
      fireEvent.click(reactTagRemoveButton);
    }
    expect(mockSetTags).toHaveBeenCalledWith(['NodeJS']); // React removed
  });

  it('should remove the last tag on Backspace if input is empty and tags exist', () => {
    const initialTags = ['React', 'Vue'];
    renderTagInput(initialTags);
    const input = screen.getByPlaceholderText(defaultPlaceholder);
    fireEvent.keyDown(input, { key: 'Backspace', code: 'Backspace' });
    expect(mockSetTags).toHaveBeenCalledWith(['React']); // Vue (last tag) removed
  });

  it('should not remove a tag on Backspace if input is not empty', () => {
    const initialTags = ['React', 'Vue'];
    renderTagInput(initialTags);
    const input = screen.getByPlaceholderText(defaultPlaceholder);
    fireEvent.change(input, { target: { value: 'S' } });
    fireEvent.keyDown(input, { key: 'Backspace', code: 'Backspace' });
    expect(mockSetTags).not.toHaveBeenCalled();
  });
  
  it('should use the provided placeholder', () => {
    const customPlaceholder = "Enter skill...";
    renderTagInput([], customPlaceholder);
    expect(screen.getByPlaceholderText(customPlaceholder)).toBeInTheDocument();
  });
});
