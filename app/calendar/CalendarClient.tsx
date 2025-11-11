'use client';

import { useState } from 'react';

type View = 'day' | 'week' | 'month' | 'year';

export default function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>('month');

  const goToToday = () => setCurrentDate(new Date());
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() - 1);
    if (view === 'week') newDate.setDate(newDate.getDate() - 7);
    if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
    if (view === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
    setCurrentDate(newDate);
  };
  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') newDate.setDate(newDate.getDate() + 1);
    if (view === 'week') newDate.setDate(newDate.getDate() + 7);
    if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
    if (view === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
    setCurrentDate(newDate);
  };

  const getWeekDays = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="cal-day-view">
        <div className="cal-time-col">
          {hours.map(hour => (
            <div key={hour} className="cal-hour-label">
              {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
            </div>
          ))}
        </div>
        <div className="cal-day-col">
          {hours.map(hour => (
            <div key={hour} className="cal-hour-slot" />
          ))}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const today = new Date().toDateString();

    return (
      <div className="cal-week-view">
        <div className="cal-week-header">
          <div className="cal-time-col-header"></div>
          {weekDays.map((day, i) => (
            <div key={i} className={`cal-day-header ${day.toDateString() === today ? 'today' : ''}`}>
              <div className="cal-day-name">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="cal-day-number">{day.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="cal-week-grid">
          <div className="cal-time-col">
            {hours.map(hour => (
              <div key={hour} className="cal-hour-label">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
            ))}
          </div>
          {weekDays.map((day, i) => (
            <div key={i} className="cal-day-col">
              {hours.map(hour => (
                <div key={hour} className="cal-hour-slot" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const weeks = [];
    const currentDateStr = new Date().toDateString();
    
    for (let week = 0; week < 6; week++) {
      const days = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (week * 7) + day);
        const isCurrentMonth = date.getMonth() === month;
        const isToday = date.toDateString() === currentDateStr;
        
        days.push(
          <div
            key={day}
            className={`cal-month-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
          >
            {date.getDate()}
          </div>
        );
      }
      weeks.push(
        <div key={week} className="cal-month-week">
          {days}
        </div>
      );
    }
    
    return (
      <div className="cal-month-view">
        <div className="cal-month-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="cal-month-day-name">{day}</div>
          ))}
        </div>
        <div className="cal-month-grid">
          {weeks}
        </div>
      </div>
    );
  };

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => i);
    const today = new Date();
    const todayStr = today.toDateString();

    return (
      <div className="cal-year-view">
        {months.map(monthIndex => {
          const firstDay = new Date(year, monthIndex, 1);
          const lastDay = new Date(year, monthIndex + 1, 0);
          const startDate = new Date(firstDay);
          startDate.setDate(startDate.getDate() - firstDay.getDay());
          
          const days = [];
          for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const isCurrentMonth = date.getMonth() === monthIndex;
            const isToday = date.toDateString() === todayStr;
            
            if (isCurrentMonth || i < 7 || i >= 35) {
              days.push(
                <div
                  key={i}
                  className={`cal-year-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                >
                  {isCurrentMonth ? date.getDate() : ''}
                </div>
              );
            }
          }

          return (
            <div key={monthIndex} className="cal-year-month">
              <div className="cal-year-month-name">
                {new Date(year, monthIndex).toLocaleDateString('en-US', { month: 'long' })}
              </div>
              <div className="cal-year-month-days">
                {days.slice(0, 35)}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const getDateRangeText = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (view === 'week') {
      const weekDays = getWeekDays(currentDate);
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.getDate()}, ${end.getFullYear()}`;
      }
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${end.getFullYear()}`;
    }
    if (view === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    if (view === 'year') {
      return currentDate.getFullYear().toString();
    }
    return '';
  };

  return (
    <div className="calendar-container">
      <div className="calendar-toolbar">
        <div className="calendar-nav">
          <button className="cal-nav-btn" onClick={goToPrevious}>‹</button>
          <button className="cal-nav-btn" onClick={goToNext}>›</button>
          <button className="cal-today-btn" onClick={goToToday}>Today</button>
          <span className="cal-date-range">{getDateRangeText()}</span>
        </div>
        <div className="calendar-view-switcher">
          <button className={`cal-view-btn ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Day</button>
          <button className={`cal-view-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
          <button className={`cal-view-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
          <button className={`cal-view-btn ${view === 'year' ? 'active' : ''}`} onClick={() => setView('year')}>Year</button>
        </div>
      </div>
      <div className="calendar-content">
        {view === 'day' && renderDayView()}
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
        {view === 'year' && renderYearView()}
      </div>
    </div>
  );
}