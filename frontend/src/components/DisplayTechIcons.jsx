import React from 'react';
import { getTechIcon } from '@/utils/helpers';

const DisplayTechIcons = ({ techstack }) => {
  return (
    <div className="flex flex-wrap gap-3">
      {techstack?.map((tech, idx) => (
        <div
          key={idx}
          className="group relative flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center hover:scale-110 transition-transform">
            <img
              src={getTechIcon(tech)}
              alt={tech}
              className="w-8 h-8"
              onError={(e) => {
                e.target.src = '/tech.svg';
              }}
            />
          </div>
          <span className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs bg-gray-800 text-white px-2 py-1 rounded">
            {tech}
          </span>
        </div>
      ))}
    </div>
  );
};

export default DisplayTechIcons;
