import React from 'react';
import { Link } from 'react-router-dom';

const variantClasses = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline'
};

const Button = ({
  variant = 'primary',
  to,
  href,
  type = 'button',
  className = '',
  disabled = false,
  onClick,
  children,
  ...rest
}) => {
  const classes = `${variantClasses[variant] || variantClasses.primary} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick} {...rest}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled} onClick={onClick} {...rest}>
      {children}
    </button>
  );
};

export default Button;