interface Props {
    title: string;
    children: React.ReactNode;
    description?: string;
  }
  
  export default function SettingsSection({ title, children, description }: Props) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
          )}
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    );
  }  