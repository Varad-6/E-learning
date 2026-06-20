import React from 'react';
import { Clock, BookOpen, Star, ArrowUpRight } from 'lucide-react';
import type { Course } from '../../types/schema';
import { Button } from '../Button/Button';
import './Card.css';

interface CardProps {
  course: Course;
  rating?: number;
  reviewsCount?: number;
  durationHours?: number;
  modulesCount?: number;
  progressPercent?: number;
  onActionClick?: () => void;
  actionLabel?: string;
}

export const Card: React.FC<CardProps> = ({
  course,
  rating = 4.7,
  reviewsCount = 124,
  durationHours = 8.5,
  modulesCount = 6,
  progressPercent,
  onActionClick,
  actionLabel = 'Enroll Now',
}) => {
  const getLevelClass = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'tag-beginner';
      case 'Intermediate':
        return 'tag-intermediate';
      case 'Advanced':
        return 'tag-advanced';
      default:
        return '';
    }
  };

  const stars = Array.from({ length: 5 }, (_, i) => {
    const isGold = i < Math.floor(rating);
    return (
      <Star
        key={i}
        size={14}
        className={isGold ? 'star-icon gold' : 'star-icon grey'}
        fill={isGold ? 'currentColor' : 'none'}
      />
    );
  });

  return (
    <div className="course-card glass-panel glow-hover animate-fade-in">
      <div className="card-header">
        <span className="course-code">{course.course_code}</span>
        <span className={`difficulty-tag ${getLevelClass(course.difficulty_level)}`}>
          {course.difficulty_level}
        </span>
      </div>

      <div className="card-body">
        <h3 className="course-title">{course.title}</h3>
        <p className="course-desc">{course.description}</p>

        <div className="course-meta">
          <div className="meta-item">
            <Clock size={15} />
            <span>{durationHours} hrs</span>
          </div>
          <div className="meta-item">
            <BookOpen size={15} />
            <span>{modulesCount} modules</span>
          </div>
        </div>

        <div className="rating-container">
          <div className="stars-row">{stars}</div>
          <span className="rating-value">{rating}</span>
          <span className="reviews-count">({reviewsCount})</span>
        </div>

        {progressPercent !== undefined && (
          <div className="progress-section">
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="progress-labels">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
        )}
      </div>

      <div className="card-footer">
        <Button
          variant={progressPercent !== undefined ? 'outline' : 'primary'}
          onClick={onActionClick}
          className="card-action-btn"
          rightIcon={<ArrowUpRight size={16} />}
        >
          {progressPercent !== undefined ? 'Continue' : actionLabel}
        </Button>
      </div>
    </div>
  );
};
