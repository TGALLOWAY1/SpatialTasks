import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className, ...rest }) => (
    <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
        {...rest}
    >
        <path
            d="M 342 146 L 200 146 Q 146 146 146 200 L 146 342 Q 146 396 200 396 L 342 396 Q 396 396 396 342 L 396 240"
            stroke="currentColor"
            strokeWidth={34}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M 204 272 L 248 316 L 330 224"
            stroke="currentColor"
            strokeWidth={34}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx={396} cy={150} r={30} fill="currentColor" />
    </svg>
);

export default Logo;
