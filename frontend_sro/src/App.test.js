import { render, screen } from '@testing-library/react';
import App from './App';

test('renders SRO portal', () => {
  render(<App />);
  const linkElement = screen.getByText(/SRO Portal/i);
  expect(linkElement).toBeInTheDocument();
});
