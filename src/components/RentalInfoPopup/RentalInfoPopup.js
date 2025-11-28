import React from 'react';
import { FormattedMessage } from '../../util/reactIntl';
import classNames from 'classnames';

import css from './RentalInfoPopup.module.css';

/**
 * A small info button that triggers the popup
 */
export const RentalInfoButton = ({ className, onClick }) => {
  return (
    <button type="button" className={classNames(css.infoButton, className)} onClick={onClick}>
      <span className={css.infoIcon}>ⓘ</span>
      <FormattedMessage id="RentalInfoPopup.buttonLabel" />
    </button>
  );
};

/**
 * The info popup component that explains what the dates mean
 */
const RentalInfoPopup = ({ isOpen, onClose, className }) => {
  if (!isOpen) return null;

  return (
    <div className={classNames(css.popupContainer, className)}>
      <div className={css.popup}>
        <button type="button" className={css.closeButton} onClick={onClose} aria-label="Close">
          ×
        </button>
        
        <h4 className={css.title}>
          <FormattedMessage id="RentalInfoPopup.title" />
        </h4>
        
        <div className={css.content}>
          <p className={css.paragraph}>
            <FormattedMessage id="RentalInfoPopup.startDateExplanation" />
          </p>
          
          <p className={css.paragraph}>
            <FormattedMessage id="RentalInfoPopup.endDateExplanation" />
          </p>
        </div>
      </div>
    </div>
  );
};

export default RentalInfoPopup;




