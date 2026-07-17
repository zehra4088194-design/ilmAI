import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { YouTubeThumbnailImage } from './index';

describe('YouTubeThumbnailImage', () => {
  it('shows the proxied thumbnail without waiting for a load event', () => {
    render(
      <YouTubeThumbnailImage
        youtubeUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        alt="Lecture thumbnail"
        className="h-full w-full object-cover"
      />
    );

    const image = screen.getByRole('img', { name: 'Lecture thumbnail' });
    expect(image).toHaveAttribute('src', '/api/media/youtube-thumbnail/dQw4w9WgXcQ');
    expect(image).not.toHaveClass('opacity-0');
  });

  it('falls back to the saved thumbnail when the proxy fails', () => {
    render(
      <YouTubeThumbnailImage
        youtubeUrl="https://youtu.be/dQw4w9WgXcQ"
        thumbnailUrl="https://cdn.example.com/lecture.jpg"
        alt="Lecture thumbnail"
      />
    );

    fireEvent.error(screen.getByRole('img', { name: 'Lecture thumbnail' }));

    expect(screen.getByRole('img', { name: 'Lecture thumbnail' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/lecture.jpg'
    );
  });
});
